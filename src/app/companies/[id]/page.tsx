"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import MuiLink from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Tab from "@mui/material/Tab";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";

import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/context/auth-context";
import { ApiError } from "@/lib/api/client";
import { companiesApi } from "@/lib/api/companies";
import { teamsApi } from "@/lib/api/teams";
import { usersApi } from "@/lib/api/users";
import type { User } from "@/types/auth";
import type { Company } from "@/types/company";
import type { CompanyMembership, CompanyRole } from "@/types/company-membership";
import type { Team } from "@/types/team";

type CompanyState =
  | { kind: "loading" }
  | { kind: "ok"; company: Company }
  | { kind: "error"; message: string };

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, token, loading: authLoading, isAuthenticated } = useAuth();

  const [companyState, setCompanyState] = useState<CompanyState>({ kind: "loading" });
  const [tab, setTab] = useState(0);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace("/login");
  }, [authLoading, isAuthenticated, router]);

  const loadCompany = () => {
    if (!token) return;
    companiesApi
      .get(token, id)
      .then((company) => setCompanyState({ kind: "ok", company }))
      .catch((err: unknown) =>
        setCompanyState({
          kind: "error",
          message: err instanceof Error ? err.message : "Failed to load company.",
        }),
      );
  };

  useEffect(() => {
    loadCompany();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id]);

  if (authLoading || !user || companyState.kind === "loading") {
    return (
      <AppShell>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <CircularProgress size={20} />
          <Typography color="text.secondary">Loading…</Typography>
        </Stack>
      </AppShell>
    );
  }

  if (!user.is_super_admin) {
    return (
      <AppShell>
        <Alert severity="warning">Super admin access required to manage companies.</Alert>
      </AppShell>
    );
  }

  if (companyState.kind === "error") {
    return (
      <AppShell>
        <Alert severity="error">{companyState.message}</Alert>
      </AppShell>
    );
  }

  const { company } = companyState;

  return (
    <AppShell>
      <Stack spacing={3} sx={{ maxWidth: 860 }}>
        <Stack spacing={1}>
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
              {company.name}
            </Typography>
            <Chip
              label={company.is_active ? "Active" : "Inactive"}
              color={company.is_active ? "success" : "default"}
              size="small"
              variant="outlined"
            />
          </Stack>
          {company.description && (
            <Typography color="text.secondary">{company.description}</Typography>
          )}
        </Stack>

        <Tabs value={tab} onChange={(_, value) => setTab(value)}>
          <Tab label="Overview" />
          <Tab label="Teams" />
          <Tab label="Employees" />
        </Tabs>

        {tab === 0 && (
          <CompanyOverviewTab
            company={company}
            token={token!}
            onSaved={(updated) => setCompanyState({ kind: "ok", company: updated })}
          />
        )}
        {tab === 1 && <CompanyTeamsTab companyId={company.id} token={token!} />}
        {tab === 2 && (
          <CompanyEmployeesTab
            companyId={company.id}
            token={token!}
            // Only a platform developer can set a company role.
            canSetRole={user.role === "platform_developer"}
          />
        )}
      </Stack>
    </AppShell>
  );
}

// --- Overview ------------------------------------------------------------------

function CompanyOverviewTab({
  company,
  token,
  onSaved,
}: {
  company: Company;
  token: string;
  onSaved: (company: Company) => void;
}) {
  const [name, setName] = useState(company.name);
  const [description, setDescription] = useState(company.description ?? "");
  const [isActive, setIsActive] = useState(company.is_active);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      const updated = await companiesApi.update(token, company.id, {
        name,
        description: description.trim() || null,
        is_active: isActive,
      });
      onSaved(updated);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save company.");
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
            Company updated successfully.
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

// --- Teams -----------------------------------------------------------------------

function CompanyTeamsTab({ companyId, token }: { companyId: string; token: string }) {
  type State =
    | { kind: "loading" }
    | { kind: "ok"; teams: Team[] }
    | { kind: "error"; message: string };

  const [state, setState] = useState<State>({ kind: "loading" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Team | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = () => {
    setState({ kind: "loading" });
    teamsApi
      .list(token, { companyId, limit: 200 })
      .then((page) => setState({ kind: "ok", teams: page.items }))
      .catch((err: unknown) =>
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : "Failed to load teams.",
        }),
      );
  };

  useEffect(() => {
    queueMicrotask(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, companyId]);

  const openCreateDialog = () => {
    setEditingTeam(null);
    setName("");
    setDescription("");
    setIsActive(true);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (team: Team) => {
    setEditingTeam(team);
    setName(team.name);
    setDescription(team.description ?? "");
    setIsActive(team.is_active);
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      if (editingTeam) {
        await teamsApi.update(token, editingTeam.id, {
          name,
          description: description.trim() || null,
          is_active: isActive,
        });
      } else {
        await teamsApi.create(token, {
          name,
          company_id: companyId,
          description: description.trim() || undefined,
        });
      }
      setDialogOpen(false);
      setEditingTeam(null);
      load();
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : `Failed to ${editingTeam ? "update" : "create"} team.`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    setDeleting(true);
    try {
      await teamsApi.remove(token, deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Failed to delete team.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
          New Team
        </Button>
      </Box>

      {state.kind === "loading" && (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <CircularProgress size={20} />
          <Typography color="text.secondary">Loading teams…</Typography>
        </Stack>
      )}

      {state.kind === "error" && <Alert severity="error">{state.message}</Alert>}

      {state.kind === "ok" && state.teams.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary">
            No teams yet. Click &quot;New Team&quot; to create one.
          </Typography>
        </Paper>
      )}

      {state.kind === "ok" && state.teams.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {state.teams.map((team) => (
                <TableRow key={team.id} hover>
                  <TableCell>
                    <MuiLink component={Link} href={`/teams/${team.id}`} underline="hover">
                      {team.name}
                    </MuiLink>
                  </TableCell>
                  <TableCell>
                    <Typography color="text.secondary" variant="body2">
                      {team.description || "—"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={team.is_active ? "Active" : "Inactive"}
                      color={team.is_active ? "success" : "default"}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography color="text.secondary" variant="body2">
                      {new Date(team.created_at).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      aria-label={`Edit ${team.name}`}
                      size="small"
                      onClick={() => openEditDialog(team)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      aria-label={`Delete ${team.name}`}
                      size="small"
                      onClick={() => {
                        setDeleteError(null);
                        setDeleteTarget(team);
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{editingTeam ? "Edit team" : "New team"}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent>
            <Stack spacing={2}>
              {formError && <Alert severity="error">{formError}</Alert>}
              <TextField
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
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
              {editingTeam && (
                <FormControlLabel
                  control={
                    <Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                  }
                  label="Active"
                />
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={submitting || !name.trim()}>
              {submitting
                ? editingTeam
                  ? "Saving…"
                  : "Creating…"
                : editingTeam
                  ? "Save"
                  : "Create"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Delete team</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {deleteError && <Alert severity="error">{deleteError}</Alert>}
            <DialogContentText>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This
              can&apos;t be undone.
            </DialogContentText>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            disabled={deleting}
            onClick={() => void handleDelete()}
          >
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

// --- Employees -------------------------------------------------------------------

const COMPANY_ROLES: { value: CompanyRole; label: string }[] = [
  { value: "employee", label: "Employee" },
  { value: "founder", label: "Founder" },
];

function CompanyEmployeesTab({
  companyId,
  token,
  canSetRole,
}: {
  companyId: string;
  token: string;
  canSetRole: boolean;
}) {
  const [employees, setEmployees] = useState<CompanyMembership[]>([]);
  const [savingRole, setSavingRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [options, setOptions] = useState<User[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    companiesApi
      .listEmployees(token, companyId)
      .then(setEmployees)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load employees."),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    queueMicrotask(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, companyId]);

  const handleSearch = (query: string) => {
    if (query.length < 1) {
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
    if (!selectedUser) return;
    setAssignError(null);
    setAssigning(true);
    try {
      await companiesApi.addEmployee(token, companyId, selectedUser.id);
      setDialogOpen(false);
      setSelectedUser(null);
      setOptions([]);
      load();
    } catch (err) {
      setAssignError(err instanceof ApiError ? err.message : "Failed to add employee.");
    } finally {
      setAssigning(false);
    }
  };

  const handleRoleChange = async (userId: string, role: CompanyRole) => {
    setSavingRole(userId);
    setError(null);
    try {
      const updated = await companiesApi.setEmployeeRole(token, companyId, userId, role);
      // Patch in place rather than refetching the whole list — the row keeps
      // its position instead of flickering.
      setEmployees((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to set the role.");
    } finally {
      setSavingRole(null);
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      await companiesApi.removeEmployee(token, companyId, userId);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove employee.");
    }
  };

  return (
    <Stack spacing={2}>
      <Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          Add employee
        </Button>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      <Paper variant="outlined">
        {loading ? (
          <Box sx={{ p: 3 }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              <CircularProgress size={20} />
              <Typography color="text.secondary">Loading employees…</Typography>
            </Stack>
          </Box>
        ) : employees.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">No employees assigned yet.</Typography>
          </Box>
        ) : (
          <List disablePadding>
            {employees.map((membership) => (
              <ListItem
                key={membership.id}
                secondaryAction={
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    {canSetRole ? (
                      <TextField
                        select
                        size="small"
                        label="Role"
                        value={membership.role}
                        disabled={savingRole === membership.user.id}
                        onChange={(e) =>
                          void handleRoleChange(
                            membership.user.id,
                            e.target.value as CompanyRole,
                          )
                        }
                        sx={{ minWidth: 140 }}
                      >
                        {COMPANY_ROLES.map((r) => (
                          <MenuItem key={r.value} value={r.value}>
                            {r.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    ) : (
                      <Chip
                        size="small"
                        label={membership.role === "founder" ? "Founder" : "Employee"}
                        color={membership.role === "founder" ? "primary" : "default"}
                        variant={membership.role === "founder" ? "filled" : "outlined"}
                      />
                    )}
                    <IconButton
                      edge="end"
                      aria-label="Remove employee"
                      onClick={() => void handleRemove(membership.user.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                }
              >
                <ListItemAvatar>
                  <Avatar src={membership.user.avatar_url ?? undefined}>
                    {(membership.user.full_name || membership.user.email).charAt(0).toUpperCase()}
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
        <DialogTitle>Add employee</DialogTitle>
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
                    ...params.slotProps,
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
            {assigning ? "Adding…" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
