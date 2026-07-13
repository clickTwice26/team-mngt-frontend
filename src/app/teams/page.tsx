"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Alert from "@mui/material/Alert";
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
import MenuItem from "@mui/material/MenuItem";
import MuiLink from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
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
import type { Company } from "@/types/company";
import type { Team } from "@/types/team";

type State =
  | { kind: "loading" }
  | { kind: "ok"; teams: Team[]; total: number }
  | { kind: "error"; message: string };

function TeamsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyIdFilter = searchParams.get("company_id");
  const { user, token, loading: authLoading, isAuthenticated } = useAuth();

  const [state, setState] = useState<State>({ kind: "loading" });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Team | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace("/login");
  }, [authLoading, isAuthenticated, router]);

  const load = () => {
    if (!token) return;
    setState({ kind: "loading" });
    teamsApi
      .list(token, { companyId: companyIdFilter ?? undefined, limit: 50 })
      .then((page) => setState({ kind: "ok", teams: page.items, total: page.total }))
      .catch((err: unknown) =>
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : "Failed to load teams.",
        }),
      );
  };

  useEffect(() => {
    if (token) queueMicrotask(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, companyIdFilter]);

  useEffect(() => {
    if (token && user?.is_super_admin) {
      companiesApi
        .list(token, { limit: 200 })
        .then((page) => setCompanies(page.items))
        .catch(() => setCompanies([]));
    }
  }, [token, user?.is_super_admin]);

  const openCreateDialog = () => {
    setEditingTeam(null);
    setName("");
    setDescription("");
    setCompanyId(companyIdFilter ?? "");
    setIsActive(true);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (team: Team) => {
    setEditingTeam(team);
    setName(team.name);
    setDescription(team.description ?? "");
    setCompanyId(team.company_id);
    setIsActive(team.is_active);
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
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
      setName("");
      setDescription("");
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
    if (!token || !deleteTarget) return;
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

  if (authLoading || !user) {
    return (
      <AppShell>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <CircularProgress size={20} />
          <Typography color="text.secondary">Loading…</Typography>
        </Stack>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Stack spacing={3}>
        <Stack
          direction="row"
          spacing={2}
          sx={{ alignItems: "center", justifyContent: "space-between" }}
        >
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
              Teams
            </Typography>
            {state.kind === "ok" && (
              <Chip label={`${state.total} total`} size="small" variant="outlined" />
            )}
            {companyIdFilter && (
              <Chip
                label="Filtered by company"
                size="small"
                onDelete={() => router.push("/teams")}
              />
            )}
          </Stack>
          {user.is_super_admin && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
              New Team
            </Button>
          )}
        </Stack>

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
              No teams yet. {user.is_super_admin && 'Click "New Team" to create one.'}
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
                  {user.is_super_admin && <TableCell align="right">Actions</TableCell>}
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
                    {user.is_super_admin && (
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
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Stack>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{editingTeam ? "Edit team" : "New team"}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent>
            <Stack spacing={2}>
              {formError && <Alert severity="error">{formError}</Alert>}
              {!editingTeam &&
                (companies.length === 0 ? (
                  <Alert severity="info">Create a company first before adding teams.</Alert>
                ) : (
                  <TextField
                    select
                    label="Company"
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                    required
                    fullWidth
                  >
                    {companies.map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.name}
                      </MenuItem>
                    ))}
                  </TextField>
                ))}
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
              {editingTeam && (
                <FormControlLabel
                  control={
                    <Switch
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                    />
                  }
                  label="Active"
                />
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting || !name.trim() || (!editingTeam && !companyId)}
            >
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

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} fullWidth maxWidth="xs">
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
    </AppShell>
  );
}

function TeamsPageFallback() {
  return (
    <AppShell>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        <CircularProgress size={20} />
        <Typography color="text.secondary">Loading…</Typography>
      </Stack>
    </AppShell>
  );
}

export default function TeamsPage() {
  return (
    <Suspense fallback={<TeamsPageFallback />}>
      <TeamsPageContent />
    </Suspense>
  );
}
