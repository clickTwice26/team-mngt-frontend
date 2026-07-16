"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
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
import BusinessIcon from "@mui/icons-material/Business";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";

import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/context/auth-context";
import { ApiError } from "@/lib/api/client";
import { companiesApi } from "@/lib/api/companies";
import type { Company } from "@/types/company";

const LOGO_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const LOGO_MAX_BYTES = 5 * 1024 * 1024; // 5 MB — matches the backend ceiling

type State =
  | { kind: "loading" }
  | { kind: "ok"; companies: Company[]; total: number }
  | { kind: "error"; message: string };

export default function CompaniesPage() {
  const router = useRouter();
  const { user, token, loading: authLoading, isAuthenticated } = useAuth();

  const [state, setState] = useState<State>({ kind: "loading" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Logo staged in the dialog until save. `logoFile` is a newly picked image to
  // upload; `logoPreview` is what the picker shows (an existing URL, a blob:
  // preview, or null); `removeLogo` clears an existing one on save.
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  // Tracks the blob: URL we created for a preview so we can revoke exactly it.
  const logoObjectUrlRef = useRef<string | null>(null);

  const revokeLogoPreview = () => {
    if (logoObjectUrlRef.current) {
      URL.revokeObjectURL(logoObjectUrlRef.current);
      logoObjectUrlRef.current = null;
    }
  };

  const handleLogoPicked = (file: File | undefined) => {
    if (!file) return;
    setFormError(null);
    if (!LOGO_ALLOWED_TYPES.includes(file.type)) {
      setFormError("Unsupported image type. Use JPEG, PNG, WEBP, or GIF.");
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setFormError("Logo must be smaller than 5MB.");
      return;
    }
    revokeLogoPreview();
    const url = URL.createObjectURL(file);
    logoObjectUrlRef.current = url;
    setLogoFile(file);
    setLogoPreview(url);
    setRemoveLogo(false);
  };

  const handleRemoveLogo = () => {
    revokeLogoPreview();
    setLogoFile(null);
    setLogoPreview(null);
    setRemoveLogo(true);
  };

  // Drop any outstanding blob: preview when the component unmounts.
  useEffect(() => revokeLogoPreview, []);

  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace("/login");
  }, [authLoading, isAuthenticated, router]);

  const load = () => {
    if (!token) return;
    setState({ kind: "loading" });
    companiesApi
      .list(token, { limit: 50 })
      .then((page) => setState({ kind: "ok", companies: page.items, total: page.total }))
      .catch((err: unknown) =>
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : "Failed to load companies.",
        }),
      );
  };

  useEffect(() => {
    if (token) queueMicrotask(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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

  if (!user.is_super_admin) {
    return (
      <AppShell>
        <Alert severity="warning">Super admin access required to view companies.</Alert>
      </AppShell>
    );
  }

  const openCreateDialog = () => {
    setEditingCompany(null);
    setName("");
    setDescription("");
    setIsActive(true);
    setFormError(null);
    revokeLogoPreview();
    setLogoFile(null);
    setLogoPreview(null);
    setRemoveLogo(false);
    setDialogOpen(true);
  };

  const openEditDialog = (company: Company) => {
    setEditingCompany(company);
    setName(company.name);
    setDescription(company.description ?? "");
    setIsActive(company.is_active);
    setFormError(null);
    revokeLogoPreview();
    setLogoFile(null);
    setLogoPreview(company.logo_url);
    setRemoveLogo(false);
    setDialogOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setFormError(null);
    setSubmitting(true);
    try {
      const company = editingCompany
        ? await companiesApi.update(token, editingCompany.id, {
            name,
            description: description.trim() || null,
            is_active: isActive,
            // Only send logo_url when clearing it; a fresh upload sets it below.
            ...(removeLogo ? { logo_url: null } : {}),
          })
        : await companiesApi.create(token, {
            name,
            description: description.trim() || undefined,
          });

      // The image is a separate multipart call, once the company has an id.
      // Reported on its own so a create still counts if only the logo fails.
      if (logoFile) {
        try {
          await companiesApi.uploadLogo(token, company.id, logoFile);
        } catch (err) {
          load();
          setFormError(
            err instanceof Error
              ? `Company saved, but the logo didn't upload: ${err.message}`
              : "Company saved, but the logo didn't upload.",
          );
          return;
        }
      }

      setDialogOpen(false);
      setEditingCompany(null);
      setName("");
      setDescription("");
      revokeLogoPreview();
      setLogoFile(null);
      setLogoPreview(null);
      setRemoveLogo(false);
      load();
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : `Failed to ${editingCompany ? "update" : "create"} company.`,
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
      await companiesApi.remove(token, deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch (err) {
      setDeleteError(
        err instanceof ApiError ? err.message : "Failed to delete company.",
      );
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
          sx={{ alignItems: "center", justifyContent: "space-between" }}
        >
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
              Companies
            </Typography>
            {state.kind === "ok" && (
              <Chip label={`${state.total} total`} size="small" variant="outlined" />
            )}
          </Stack>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
            New Company
          </Button>
        </Stack>

        {state.kind === "loading" && (
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <CircularProgress size={20} />
            <Typography color="text.secondary">Loading companies…</Typography>
          </Stack>
        )}

        {state.kind === "error" && <Alert severity="error">{state.message}</Alert>}

        {state.kind === "ok" && state.companies.length === 0 && (
          <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">
              No companies yet. Create one to get started.
            </Typography>
          </Paper>
        )}

        {state.kind === "ok" && state.companies.length > 0 && (
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
                {state.companies.map((company) => (
                  <TableRow key={company.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                        <Avatar
                          src={company.logo_url ?? undefined}
                          variant="rounded"
                          sx={{ width: 32, height: 32, bgcolor: "action.hover", color: "text.secondary" }}
                        >
                          {!company.logo_url && <BusinessIcon fontSize="small" />}
                        </Avatar>
                        <MuiLink
                          component={Link}
                          href={`/teams?company_id=${company.id}`}
                          underline="hover"
                        >
                          {company.name}
                        </MuiLink>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography color="text.secondary" variant="body2">
                        {company.description || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={company.is_active ? "Active" : "Inactive"}
                        color={company.is_active ? "success" : "default"}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography color="text.secondary" variant="body2">
                        {new Date(company.created_at).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        aria-label={`Manage ${company.name}`}
                        size="small"
                        component={Link}
                        href={`/companies/${company.id}`}
                      >
                        <ManageAccountsIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        aria-label={`Edit ${company.name}`}
                        size="small"
                        onClick={() => openEditDialog(company)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        aria-label={`Delete ${company.name}`}
                        size="small"
                        onClick={() => {
                          setDeleteError(null);
                          setDeleteTarget(company);
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
      </Stack>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{editingCompany ? "Edit company" : "New company"}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent>
            <Stack spacing={2}>
              {formError && <Alert severity="error">{formError}</Alert>}

              <Stack spacing={1} sx={{ alignItems: "center" }}>
                <Box sx={{ position: "relative" }}>
                  <Avatar
                    src={logoPreview ?? undefined}
                    variant="rounded"
                    sx={{ width: 72, height: 72, bgcolor: "action.hover", color: "text.secondary" }}
                  >
                    {!logoPreview && <BusinessIcon />}
                  </Avatar>
                  <IconButton
                    aria-label="Upload logo"
                    size="small"
                    onClick={() => logoInputRef.current?.click()}
                    sx={{
                      position: "absolute",
                      right: -6,
                      bottom: -6,
                      bgcolor: "background.paper",
                      border: 1,
                      borderColor: "divider",
                      "&:hover": { bgcolor: "background.paper" },
                    }}
                  >
                    <CameraAltIcon fontSize="small" />
                  </IconButton>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept={LOGO_ALLOWED_TYPES.join(",")}
                    hidden
                    onChange={(e) => {
                      handleLogoPicked(e.target.files?.[0]);
                      e.target.value = ""; // allow re-picking the same file
                    }}
                  />
                </Box>
                {logoPreview ? (
                  <Button size="small" color="inherit" onClick={handleRemoveLogo}>
                    Remove logo
                  </Button>
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    Logo (optional)
                  </Typography>
                )}
              </Stack>

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
              {editingCompany && (
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
            <Button type="submit" variant="contained" disabled={submitting || !name.trim()}>
              {submitting
                ? editingCompany
                  ? "Saving…"
                  : "Creating…"
                : editingCompany
                  ? "Save"
                  : "Create"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Delete company</DialogTitle>
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
