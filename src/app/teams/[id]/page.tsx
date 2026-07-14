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
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";

import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/context/auth-context";
import { ApiError } from "@/lib/api/client";
import { companiesApi } from "@/lib/api/companies";
import { teamsApi } from "@/lib/api/teams";
import type { Membership, MembershipUser } from "@/types/membership";
import type { Team } from "@/types/team";

import { TasksTab } from "./_components/tasks-tab";

type TeamState =
  | { kind: "loading" }
  | { kind: "ok"; team: Team }
  | { kind: "error"; message: string };

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, token, loading: authLoading, isAuthenticated } = useAuth();

  const [teamState, setTeamState] = useState<TeamState>({ kind: "loading" });
  const [tab, setTab] = useState(0);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace("/login");
  }, [authLoading, isAuthenticated, router]);

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
  }, [token, id]);

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

        <Tabs value={tab} onChange={(_, value) => setTab(value)}>
          <Tab label="Overview" />
          <Tab label="Members" />
          <Tab label="Tasks" />
        </Tabs>

        {tab === 0 && (
          <TeamOverviewTab
            team={team}
            token={token!}
            onSaved={(updated) => setTeamState({ kind: "ok", team: updated })}
          />
        )}
        {tab === 1 && (
          <TeamMembersTab team={team} token={token!} canManage={user.is_super_admin} />
        )}
        {tab === 2 && (
          <TasksTab
            team={team}
            token={token!}
            currentUserId={user.id}
            isSuperAdmin={user.is_super_admin}
          />
        )}
      </Stack>
    </AppShell>
  );
}

// --- Overview ------------------------------------------------------------------

function TeamOverviewTab({
  team,
  token,
  onSaved,
}: {
  team: Team;
  token: string;
  onSaved: (team: Team) => void;
}) {
  const [name, setName] = useState(team.name);
  const [description, setDescription] = useState(team.description ?? "");
  const [isActive, setIsActive] = useState(team.is_active);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      const updated = await teamsApi.update(token, team.id, {
        name,
        description: description.trim() || null,
        is_active: isActive,
      });
      onSaved(updated);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save team.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 4, maxWidth: 480 }}>
      <Stack spacing={2} component="form" onSubmit={(e) => void handleSubmit(e)}>
        {error && <Alert severity="error">{error}</Alert>}
        {success && (
          <Alert severity="success" onClose={() => setSuccess(false)}>
            Team updated successfully.
          </Alert>
        )}
        <TextField
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          fullWidth
        />
        <TextField
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          fullWidth
          multiline
          minRows={2}
        />
        <FormControlLabel
          control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />}
          label="Active"
        />
        <Box>
          <Button type="submit" variant="contained" disabled={submitting || !name.trim()}>
            {submitting ? "Saving…" : "Save"}
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}

// --- Members ---------------------------------------------------------------------

function TeamMembersTab({
  team,
  token,
  canManage,
}: {
  team: Team;
  token: string;
  canManage: boolean;
}) {
  const [members, setMembers] = useState<Membership[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [companyEmployees, setCompanyEmployees] = useState<MembershipUser[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [options, setOptions] = useState<MembershipUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<MembershipUser | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const loadMembers = () => {
    setMembersLoading(true);
    teamsApi
      .listMembers(token, team.id)
      .then(setMembers)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load members."),
      )
      .finally(() => setMembersLoading(false));
  };

  useEffect(() => {
    // Only super admins/developers can assign members, so only they need the
    // company's employee directory — everyone else would just get a 403.
    if (canManage) {
      companiesApi
        .listEmployees(token, team.company_id)
        .then((employees) => setCompanyEmployees(employees.map((m) => m.user)))
        .catch(() => setCompanyEmployees([]));
    }
    queueMicrotask(loadMembers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, team.id, team.company_id, canManage]);

  // Only company employees who aren't already on this team can be assigned.
  const availableEmployees = () => {
    const assignedIds = new Set(members.map((m) => m.user.id));
    return companyEmployees.filter((e) => !assignedIds.has(e.id));
  };

  const handleSearch = (query: string) => {
    const q = query.trim().toLowerCase();
    const available = availableEmployees();
    setOptions(
      q.length === 0
        ? available
        : available.filter(
            (e) => e.full_name?.toLowerCase().includes(q) || e.email.toLowerCase().includes(q),
          ),
    );
  };

  const handleAssign = async () => {
    if (!selectedUser) return;
    setAssignError(null);
    setAssigning(true);
    try {
      await teamsApi.addMember(token, team.id, selectedUser.id);
      setDialogOpen(false);
      setSelectedUser(null);
      setOptions([]);
      loadMembers();
    } catch (err) {
      setAssignError(err instanceof ApiError ? err.message : "Failed to assign member.");
    } finally {
      setAssigning(false);
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      await teamsApi.removeMember(token, team.id, userId);
      loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member.");
    }
  };

  return (
    <Stack spacing={2}>
      {error && <Alert severity="error">{error}</Alert>}

      <Stack direction="row" sx={{ justifyContent: "flex-end" }}>
        {canManage && (
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => {
              handleSearch("");
              setDialogOpen(true);
            }}
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
                  canManage && (
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
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
              filterOptions={(x) => x}
              noOptionsText={
                companyEmployees.length === 0
                  ? "This company has no employees yet."
                  : "No matching employees."
              }
              renderInput={(params) => (
                <TextField {...params} label="Search by name or email" autoFocus fullWidth />
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
    </Stack>
  );
}
