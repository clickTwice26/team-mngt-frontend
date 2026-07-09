"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";

import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/context/auth-context";
import { teamsApi } from "@/lib/api/teams";
import { usersApi } from "@/lib/api/users";
import type { User } from "@/types/auth";
import type { Membership } from "@/types/membership";
import type { Team } from "@/types/team";

type TeamState =
  | { kind: "loading" }
  | { kind: "ok"; team: Team }
  | { kind: "error"; message: string };

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, token, loading: authLoading, isAuthenticated } = useAuth();

  const [teamState, setTeamState] = useState<TeamState>({ kind: "loading" });
  const [members, setMembers] = useState<Membership[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [options, setOptions] = useState<User[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace("/login");
  }, [authLoading, isAuthenticated, router]);

  const loadMembers = () => {
    if (!token) return;
    setMembersLoading(true);
    teamsApi
      .listMembers(token, id)
      .then(setMembers)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load members."),
      )
      .finally(() => setMembersLoading(false));
  };

  useEffect(() => {
    if (!token) return;
    teamsApi
      .get(token, id)
      .then((team) => setTeamState({ kind: "ok", team }))
      .catch((err: unknown) =>
        setTeamState({
          kind: "error",
          message: err instanceof Error ? err.message : "Failed to load team.",
        }),
      );
    queueMicrotask(loadMembers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id]);

  const handleSearch = (query: string) => {
    if (!token || query.length < 1) {
      setOptions([]);
      return;
    }
    setSearchLoading(true);
    usersApi
      .list(token, { search: query, limit: 10 })
      .then((page) => setOptions(page.items))
      .catch(() => setOptions([]))
      .finally(() => setSearchLoading(false));
  };

  const handleAssign = async () => {
    if (!token || !selectedUser) return;
    setAssignError(null);
    setAssigning(true);
    try {
      await teamsApi.addMember(token, id, selectedUser.id);
      setDialogOpen(false);
      setSelectedUser(null);
      setOptions([]);
      loadMembers();
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : "Failed to assign member.");
    } finally {
      setAssigning(false);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!token) return;
    try {
      await teamsApi.removeMember(token, id, userId);
      loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member.");
    }
  };

  if (authLoading || !user || teamState.kind === "loading") {
    return (
      <AppShell>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <CircularProgress size={20} />
          <Typography color="text.secondary">Loading…</Typography>
        </Stack>
      </AppShell>
    );
  }

  if (teamState.kind === "error") {
    return (
      <AppShell>
        <Alert severity="error">{teamState.message}</Alert>
      </AppShell>
    );
  }

  const { team } = teamState;

  return (
    <AppShell>
      <Stack spacing={3} sx={{ maxWidth: 720 }}>
        <Stack spacing={1}>
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
              {team.name}
            </Typography>
            <Chip
              label={team.is_active ? "Active" : "Inactive"}
              color={team.is_active ? "success" : "default"}
              size="small"
              variant="outlined"
            />
          </Stack>
          {team.description && (
            <Typography color="text.secondary">{team.description}</Typography>
          )}
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}

        <Stack
          direction="row"
          spacing={2}
          sx={{ alignItems: "center", justifyContent: "space-between" }}
        >
          <Typography variant="h6">Members</Typography>
          {user.is_super_admin && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setDialogOpen(true)}
            >
              Assign member
            </Button>
          )}
        </Stack>

        <Paper variant="outlined">
          {membersLoading ? (
            <Box sx={{ p: 3 }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <CircularProgress size={20} />
                <Typography color="text.secondary">Loading members…</Typography>
              </Stack>
            </Box>
          ) : members.length === 0 ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <Typography color="text.secondary">No members assigned yet.</Typography>
            </Box>
          ) : (
            <List disablePadding>
              {members.map((membership) => (
                <ListItem
                  key={membership.id}
                  secondaryAction={
                    user.is_super_admin && (
                      <IconButton
                        edge="end"
                        aria-label="Remove member"
                        onClick={() => void handleRemove(membership.user.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )
                  }
                >
                  <ListItemAvatar>
                    <Avatar src={membership.user.avatar_url ?? undefined}>
                      {(membership.user.full_name || membership.user.email)
                        .charAt(0)
                        .toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={membership.user.full_name || "Unnamed user"}
                    secondary={membership.user.email}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      </Stack>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Assign member</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {assignError && <Alert severity="error">{assignError}</Alert>}
            <Autocomplete
              options={options}
              value={selectedUser}
              onChange={(_, value) => setSelectedUser(value)}
              onInputChange={(_, value) => handleSearch(value)}
              getOptionLabel={(option) => `${option.full_name || option.email} (${option.email})`}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              loading={searchLoading}
              filterOptions={(x) => x}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search by name or email"
                  autoFocus
                  slotProps={{
                    input: {
                      ...params.slotProps.input,
                      endAdornment: (
                        <>
                          {searchLoading && <CircularProgress size={16} />}
                          {params.slotProps.input.endAdornment}
                        </>
                      ),
                    },
                  }}
                />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!selectedUser || assigning}
            onClick={() => void handleAssign()}
          >
            {assigning ? "Assigning…" : "Assign"}
          </Button>
        </DialogActions>
      </Dialog>
    </AppShell>
  );
}
