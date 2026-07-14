"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import LoginIcon from "@mui/icons-material/Login";

import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/context/auth-context";
import { ApiError } from "@/lib/api/client";
import { usersApi } from "@/lib/api/users";
import type { PlatformRole, User } from "@/types/auth";

type State =
  | { kind: "loading" }
  | { kind: "ok"; users: User[]; total: number }
  | { kind: "error"; message: string };

const ROLE_LABELS: Record<PlatformRole, string> = {
  member: "Member",
  super_admin: "Super Admin",
  platform_developer: "Platform Developer",
};

/**
 * Why a given account can't be impersonated, or null if it can. Mirrors the
 * rules the backend enforces in `ImpersonationService.start` — this only decides
 * what to disable and what tooltip to show; the server is the authority.
 */
function impersonationBlockedReason(target: User, self: User): string | null {
  if (target.id === self.id) return "You are already signed in as yourself";
  if (target.role === "platform_developer")
    return "Platform developers cannot be impersonated";
  if (!target.is_active) return "This account is disabled";
  return null;
}

export default function UsersPage() {
  const router = useRouter();
  const {
    user,
    token,
    loading: authLoading,
    isAuthenticated,
    startImpersonation,
  } = useAuth();

  const [state, setState] = useState<State>({ kind: "loading" });
  const [search, setSearch] = useState("");

  const [impersonateTarget, setImpersonateTarget] = useState<User | null>(null);
  const [impersonating, setImpersonating] = useState(false);
  const [impersonateError, setImpersonateError] = useState<string | null>(null);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [fullName, setFullName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace("/login");
  }, [authLoading, isAuthenticated, router]);

  const load = (searchTerm: string) => {
    if (!token) return;
    setState({ kind: "loading" });
    usersApi
      .list(token, { search: searchTerm || undefined, limit: 100 })
      .then((page) => setState({ kind: "ok", users: page.items, total: page.total }))
      .catch((err: unknown) =>
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : "Failed to load users.",
        }),
      );
  };

  useEffect(() => {
    if (!token) return;
    const handle = setTimeout(() => load(search), 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, search]);

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

  if (user.role !== "platform_developer") {
    return (
      <AppShell>
        <Alert severity="warning">Platform developer access required to view users.</Alert>
      </AppShell>
    );
  }

  const openEditDialog = (target: User) => {
    setEditingUser(target);
    setFullName(target.full_name ?? "");
    setIsActive(target.is_active);
    setFormError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !editingUser) return;
    setFormError(null);
    setSubmitting(true);
    try {
      await usersApi.update(token, editingUser.id, {
        full_name: fullName.trim() || null,
        is_active: isActive,
      });
      setEditingUser(null);
      load(search);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Failed to update user.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleImpersonate = async () => {
    if (!impersonateTarget) return;
    setImpersonateError(null);
    setImpersonating(true);
    try {
      await startImpersonation(impersonateTarget.id);
      setImpersonateTarget(null);
      // Land on the dashboard: /users is developer-only, so staying here would
      // just render "access required" as the person we're now acting as.
      router.push("/dashboard");
    } catch (err) {
      setImpersonateError(
        err instanceof ApiError ? err.message : "Failed to start impersonation.",
      );
      setImpersonating(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !deleteTarget) return;
    setDeleteError(null);
    setDeleting(true);
    try {
      await usersApi.remove(token, deleteTarget.id);
      setDeleteTarget(null);
      load(search);
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Failed to delete user.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppShell>
      <Stack spacing={3}>
        <Stack
          direction="row"
          spacing={2}
          sx={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}
        >
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
              Users
            </Typography>
            {state.kind === "ok" && (
              <Chip label={`${state.total} total`} size="small" variant="outlined" />
            )}
          </Stack>
          <TextField
            size="small"
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 260 }}
          />
        </Stack>

        {state.kind === "loading" && (
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <CircularProgress size={20} />
            <Typography color="text.secondary">Loading users…</Typography>
          </Stack>
        )}

        {state.kind === "error" && <Alert severity="error">{state.message}</Alert>}

        {state.kind === "ok" && state.users.length === 0 && (
          <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">No users found.</Typography>
          </Paper>
        )}

        {state.kind === "ok" && state.users.length > 0 && (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {state.users.map((target) => {
                  const isSelf = target.id === user.id;
                  const blockedReason = impersonationBlockedReason(target, user);
                  return (
                    <TableRow key={target.id} hover>
                      <TableCell>{target.full_name || "—"}</TableCell>
                      <TableCell>
                        <Typography color="text.secondary" variant="body2">
                          {target.email}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={ROLE_LABELS[target.role]} size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={target.is_active ? "Active" : "Inactive"}
                          color={target.is_active ? "success" : "default"}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography color="text.secondary" variant="body2">
                          {new Date(target.created_at).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip
                          title={blockedReason ?? `Sign in as ${target.email}`}
                        >
                          <span>
                            <IconButton
                              aria-label={`Impersonate ${target.email}`}
                              size="small"
                              disabled={blockedReason !== null}
                              onClick={() => {
                                setImpersonateError(null);
                                setImpersonateTarget(target);
                              }}
                            >
                              <LoginIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <IconButton
                          aria-label={`Edit ${target.email}`}
                          size="small"
                          onClick={() => openEditDialog(target)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <Tooltip title={isSelf ? "You can't delete your own account" : ""}>
                          <span>
                            <IconButton
                              aria-label={`Delete ${target.email}`}
                              size="small"
                              disabled={isSelf}
                              onClick={() => {
                                setDeleteError(null);
                                setDeleteTarget(target);
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Stack>

      <Dialog open={Boolean(editingUser)} onClose={() => setEditingUser(null)} fullWidth maxWidth="xs">
        <DialogTitle>Edit user</DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent>
            <Stack spacing={2}>
              {formError && <Alert severity="error">{formError}</Alert>}
              <TextField
                label="Email"
                value={editingUser?.email ?? ""}
                fullWidth
                disabled
              />
              <TextField
                label="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoFocus
                fullWidth
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={isActive}
                    disabled={editingUser?.id === user.id}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                }
                label={
                  editingUser?.id === user.id
                    ? "Active (you can't deactivate your own account)"
                    : "Active"
                }
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setEditingUser(null)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? "Saving…" : "Save"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog
        open={Boolean(impersonateTarget)}
        onClose={() => (impersonating ? undefined : setImpersonateTarget(null))}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Sign in as this user</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {impersonateError && <Alert severity="error">{impersonateError}</Alert>}
            <DialogContentText>
              You&apos;ll use TeamUp as{" "}
              <strong>{impersonateTarget?.full_name || impersonateTarget?.email}</strong>{" "}
              for <strong>10 minutes</strong>, and anything you do will be recorded
              against your own account. You can leave at any time from the banner at
              the top of the page.
            </DialogContentText>
            <Alert severity="info">
              You won&apos;t be able to change their password or picture while signed
              in as them.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button disabled={impersonating} onClick={() => setImpersonateTarget(null)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={impersonating}
            onClick={() => void handleImpersonate()}
          >
            {impersonating ? "Signing in…" : "Sign in as user"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Delete user</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {deleteError && <Alert severity="error">{deleteError}</Alert>}
            <DialogContentText>
              Are you sure you want to delete{" "}
              <strong>{deleteTarget?.full_name || deleteTarget?.email}</strong>? This can&apos;t
              be undone.
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
