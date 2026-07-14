"use client";

import { Suspense, useEffect, useState } from "react";
import NextLink from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import InsightsIcon from "@mui/icons-material/Insights";
import ScheduleIcon from "@mui/icons-material/Schedule";

import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/context/auth-context";
import { ApiError } from "@/lib/api/client";
import { companiesApi } from "@/lib/api/companies";
import { teamsApi } from "@/lib/api/teams";
import type { Membership, MembershipUser } from "@/types/membership";
import type { Team } from "@/types/team";

import { TasksTab } from "./_components/tasks-tab";
import { MeetingsTab } from "./_components/meetings-tab";
import { WorkLogTab } from "./_components/work-log-tab";
import {
  WorkArrangementDialog,
  WorkChip,
  WorkSummary,
} from "./_components/work-arrangement-dialog";

type TeamState =
  | { kind: "loading" }
  | { kind: "ok"; team: Team }
  | { kind: "error"; message: string };

/** Tabs are addressed by name rather than index, so `?tab=members` stays
 *  meaningful (and keeps working if the tab order ever changes). The "hours"
 *  tab only exists for a member working on this team on an hourly basis. */
const BASE_TABS = ["overview", "members", "tasks"] as const;
type TabKey = (typeof BASE_TABS)[number] | "hours" | "meetings";

function TeamDetailPageContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token, loading: authLoading, isAuthenticated } = useAuth();

  const [teamState, setTeamState] = useState<TeamState>({ kind: "loading" });
  // The current user's own membership, used to decide whether they log hours
  // here. `undefined` while unknown; `null` if they aren't a member.
  const [myMembership, setMyMembership] = useState<Membership | null | undefined>(undefined);

  const isHourlyMember = myMembership?.work.mode === "hourly";
  // Anyone on the team can schedule and join a meeting, so the tab is for
  // everyone — unlike "My Hours", which only exists for an hourly member.
  const tabKeys: TabKey[] = [
    ...BASE_TABS,
    ...(isHourlyMember ? (["hours"] as const) : []),
    "meetings",
  ];

  // Unknown or missing `?tab=` falls back to Overview rather than rendering
  // an empty panel.
  const tabParam = searchParams.get("tab");
  const tab: TabKey = tabKeys.includes(tabParam as TabKey)
    ? (tabParam as TabKey)
    : "overview";

  const selectTab = (next: TabKey) => {
    const params = new URLSearchParams(searchParams.toString());
    // Overview is the default, so keep its URL clean.
    if (next === "overview") params.delete("tab");
    else params.set("tab", next);
    const query = params.toString();
    // `replace`, not `push`: tab switches shouldn't each add a history entry
    // that Back has to walk through to leave the page.
    router.replace(query ? `/teams/${id}?${query}` : `/teams/${id}`, { scroll: false });
  };

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

  useEffect(() => {
    if (!token || !user) return;
    // Find our own membership to know whether to offer the hours tab. Any team
    // member can list members, so this is safe for everyone.
    teamsApi
      .listMembers(token, id)
      .then((members) => setMyMembership(members.find((m) => m.user.id === user.id) ?? null))
      .catch(() => setMyMembership(null));
  }, [token, id, user]);

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
      {/* The hours tab is two columns (entries + calendar), so it needs more
          room than the single-column tabs. */}
      <Stack spacing={3} sx={{ maxWidth: tab === "hours" || tab === "meetings" ? 1100 : 720 }}>
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

        <Tabs value={tab} onChange={(_, value: TabKey) => selectTab(value)}>
          <Tab value="overview" label="Overview" />
          <Tab value="members" label="Members" />
          <Tab value="tasks" label="Tasks" />
          {isHourlyMember && <Tab value="hours" label="My Hours" />}
          <Tab value="meetings" label="Meetings" />
        </Tabs>

        {tab === "overview" && (
          <TeamOverviewTab
            team={team}
            token={token!}
            onSaved={(updated) => setTeamState({ kind: "ok", team: updated })}
          />
        )}
        {tab === "members" && (
          <TeamMembersTab
            team={team}
            token={token!}
            canManage={user.is_super_admin}
            // Setting a member's working method is developer-only (the endpoint
            // is gated on PlatformDeveloperDep).
            canSetWork={user.role === "platform_developer"}
          />
        )}
        {tab === "tasks" && (
          <TasksTab
            team={team}
            token={token!}
            currentUserId={user.id}
            isSuperAdmin={user.is_super_admin}
          />
        )}
        {tab === "meetings" && (
          <MeetingsTab
            team={team}
            token={token!}
            currentUserId={user.id}
            isDeveloper={user.role === "platform_developer"}
          />
        )}
        {tab === "hours" && isHourlyMember && myMembership && (
          <WorkLogTab
            team={team}
            token={token!}
            currentUserId={user.id}
            hoursPerWeek={myMembership.work.hours_per_week}
          />
        )}
      </Stack>
    </AppShell>
  );
}

function TeamDetailPageFallback() {
  return (
    <AppShell>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        <CircularProgress size={20} />
        <Typography color="text.secondary">Loading…</Typography>
      </Stack>
    </AppShell>
  );
}

// `useSearchParams` needs a Suspense boundary above it — same shape as the
// teams list page.
export default function TeamDetailPage() {
  return (
    <Suspense fallback={<TeamDetailPageFallback />}>
      <TeamDetailPageContent />
    </Suspense>
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
  canSetWork,
}: {
  team: Team;
  token: string;
  canManage: boolean;
  canSetWork: boolean;
}) {
  const [workTarget, setWorkTarget] = useState<Membership | null>(null);
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
                alignItems="flex-start"
                secondaryAction={
                  <Stack direction="row" spacing={0.5}>
                    {canSetWork && (
                      <Tooltip title="Performance">
                        <IconButton
                          edge="end"
                          component={NextLink}
                          href={`/teams/${team.id}/members/${membership.user.id}/performance`}
                          aria-label={`Performance for ${
                            membership.user.full_name || membership.user.email
                          }`}
                        >
                          <InsightsIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {canSetWork && (
                      <Tooltip title="Set working method">
                        <IconButton
                          edge="end"
                          aria-label={`Set working method for ${
                            membership.user.full_name || membership.user.email
                          }`}
                          onClick={() => setWorkTarget(membership)}
                        >
                          <ScheduleIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {canManage && (
                      <IconButton
                        edge="end"
                        aria-label="Remove member"
                        onClick={() => void handleRemove(membership.user.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Stack>
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
                  primary={
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      <span>{membership.user.full_name || "Unnamed user"}</span>
                      <WorkChip work={membership.work} />
                    </Stack>
                  }
                  secondary={
                    <Stack component="span" spacing={0.25}>
                      <span>{membership.user.email}</span>
                      <WorkSummary work={membership.work} />
                    </Stack>
                  }
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

      {workTarget && (
        <WorkArrangementDialog
          // Keyed by member so the dialog's form state resets when a different
          // member is picked, rather than showing the previous one's values.
          key={workTarget.id}
          open
          membership={workTarget}
          teamId={team.id}
          token={token}
          onClose={() => setWorkTarget(null)}
          onSaved={(updated) => {
            setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
            setWorkTarget(null);
          }}
        />
      )}
    </Stack>
  );
}
