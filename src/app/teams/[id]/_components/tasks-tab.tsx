"use client";

import { useEffect, useRef, useState } from "react";
import NextLink from "next/link";
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
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ImageIcon from "@mui/icons-material/Image";
import MicIcon from "@mui/icons-material/Mic";
import VideocamIcon from "@mui/icons-material/Videocam";
import VisibilityIcon from "@mui/icons-material/Visibility";

import { Markdown } from "@/components/markdown";
import { ApiError } from "@/lib/api/client";
import { teamsApi } from "@/lib/api/teams";

import { AttachmentView } from "./attachment-view";
import type { Membership, MembershipUser } from "@/types/membership";
import type { Task, TaskAttachment, TaskPriority, TaskStatus } from "@/types/task";
import type { Team } from "@/types/team";

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

const STATUS_COLORS: Record<TaskStatus, "default" | "info" | "success"> = {
  todo: "default",
  in_progress: "info",
  done: "success",
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const PRIORITY_COLORS: Record<TaskPriority, "default" | "info" | "warning" | "error"> = {
  low: "default",
  medium: "info",
  high: "warning",
  urgent: "error",
};

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const AUDIO_ACCEPT = "audio/mpeg,audio/mp4,audio/x-m4a,audio/aac,audio/wav,audio/webm,audio/ogg";
const VIDEO_ACCEPT = "video/mp4,video/webm,video/quicktime,video/ogg";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function isOverdue(task: Task): boolean {
  if (!task.deadline || task.status === "done") return false;
  const end = new Date(task.deadline);
  end.setHours(23, 59, 59, 999);
  return end.getTime() < Date.now();
}


export function TasksTab({
  team,
  token,
  currentUserId,
  isSuperAdmin,
}: {
  team: Team;
  token: string;
  currentUserId: string;
  isSuperAdmin: boolean;
}) {
  type State =
    | { kind: "loading" }
    | { kind: "ok"; tasks: Task[] }
    | { kind: "error"; message: string };

  const [state, setState] = useState<State>({ kind: "loading" });
  const [members, setMembers] = useState<Membership[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [descMode, setDescMode] = useState<"write" | "preview">("write");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [deadline, setDeadline] = useState(""); // yyyy-mm-dd or ""
  const [assignees, setAssignees] = useState<MembershipUser[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [previewAttachment, setPreviewAttachment] = useState<TaskAttachment | null>(null);

  const load = () => {
    setState({ kind: "loading" });
    teamsApi
      .listTasks(token, team.id)
      .then((tasks) => setState({ kind: "ok", tasks }))
      .catch((err: unknown) =>
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : "Failed to load tasks.",
        }),
      );
  };

  useEffect(() => {
    queueMicrotask(load);
    teamsApi
      .listMembers(token, team.id)
      .then(setMembers)
      .catch(() => setMembers([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, team.id]);

  const memberOptions = members.map((m) => m.user);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDescMode("write");
    setPriority("medium");
    setStatus("todo");
    setDeadline("");
    setAssignees([]);
    setAttachments([]);
    setFormError(null);
  };

  const openCreateDialog = () => {
    setEditingTask(null);
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description ?? "");
    setDescMode("write");
    setPriority(task.priority);
    setStatus(task.status);
    setDeadline(task.deadline ? task.deadline.slice(0, 10) : "");
    setAssignees(task.assignees);
    setAttachments(task.attachments);
    setFormError(null);
    setDialogOpen(true);
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = ""; // allow re-picking the same file
    if (files.length === 0) return;
    setFormError(null);
    setUploading(true);
    try {
      for (const file of files) {
        const uploaded = await teamsApi.uploadTaskAttachment(token, team.id, file);
        setAttachments((prev) => [...prev, uploaded]);
      }
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Failed to upload file.");
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (url: string) => {
    setAttachments((prev) => prev.filter((a) => a.url !== url));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const shared = {
        title,
        description: description.trim() || null,
        priority,
        deadline: deadline ? deadline : null,
        assignee_ids: assignees.map((a) => a.id),
        attachments,
      };
      if (editingTask) {
        // Non-assignees may still edit the rest of the task, so send `status`
        // only when they're allowed to set it — the server rejects it otherwise.
        const canSetStatus = editingTask.assignees.some((a) => a.id === currentUserId);
        await teamsApi.updateTask(token, team.id, editingTask.id, {
          ...shared,
          ...(canSetStatus ? { status } : {}),
        });
      } else {
        await teamsApi.createTask(token, team.id, {
          ...shared,
          description: description.trim() || undefined,
        });
      }
      setDialogOpen(false);
      setEditingTask(null);
      load();
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : `Failed to ${editingTask ? "update" : "submit"} task.`,
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
      await teamsApi.removeTask(token, team.id, deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Failed to delete task.");
    } finally {
      setDeleting(false);
    }
  };

  const handleQuickStatusChange = async (task: Task, next: TaskStatus) => {
    try {
      await teamsApi.updateTask(token, team.id, task.id, { status: next });
    } finally {
      load();
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: "flex-end" }}>
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={openCreateDialog}>
          New task
        </Button>
      </Stack>

      {state.kind === "loading" && (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <CircularProgress size={20} />
          <Typography color="text.secondary">Loading tasks…</Typography>
        </Stack>
      )}

      {state.kind === "error" && <Alert severity="error">{state.message}</Alert>}

      {state.kind === "ok" && state.tasks.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary">
            No tasks yet. Click &quot;New task&quot; to submit one.
          </Typography>
        </Paper>
      )}

      {state.kind === "ok" && state.tasks.length > 0 && (
        <Stack spacing={1.5}>
          {state.tasks.map((task) => {
            const canDelete = isSuperAdmin || task.created_by.id === currentUserId;
            // Status is the assignee's to report — mirrors the server rule, which
            // rejects it for anyone else (see TaskService.update_task).
            const canSetStatus = task.assignees.some((a) => a.id === currentUserId);
            // The discussion is private to the submitter and the assignees, so
            // only show the link to someone who'd actually be let in.
            const isParticipant = canSetStatus || task.created_by.id === currentUserId;
            const overdue = isOverdue(task);
            return (
              <Paper key={task.id} variant="outlined" sx={{ p: 2 }}>
                <Stack spacing={1.5}>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: "flex-start", justifyContent: "space-between" }}
                  >
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                      <Typography sx={{ fontWeight: 600 }}>{task.title}</Typography>
                      <Chip
                        label={PRIORITY_LABELS[task.priority]}
                        color={PRIORITY_COLORS[task.priority]}
                        size="small"
                        variant={task.priority === "low" ? "outlined" : "filled"}
                      />
                      <Chip
                        label={STATUS_LABELS[task.status]}
                        color={STATUS_COLORS[task.status]}
                        size="small"
                      />
                    </Stack>
                    <Stack direction="row" spacing={0.5}>
                      {isParticipant && (
                        <Tooltip title="Discussion">
                          <IconButton
                            size="small"
                            component={NextLink}
                            href={`/teams/${team.id}/tasks/${task.id}`}
                            aria-label={`Discussion for ${task.title}`}
                          >
                            <ChatBubbleOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <IconButton
                        size="small"
                        aria-label={`Edit ${task.title}`}
                        onClick={() => openEditDialog(task)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      {canDelete && (
                        <IconButton
                          size="small"
                          aria-label={`Delete ${task.title}`}
                          onClick={() => {
                            setDeleteError(null);
                            setDeleteTarget(task);
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Stack>
                  </Stack>

                  {task.description && <Markdown>{task.description}</Markdown>}

                  {task.deadline && (
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                      <CalendarTodayIcon
                        fontSize="inherit"
                        color={overdue ? "error" : "action"}
                      />
                      <Typography
                        variant="caption"
                        color={overdue ? "error" : "text.secondary"}
                        sx={{ fontWeight: overdue ? 600 : 400 }}
                      >
                        Due {formatDeadline(task.deadline)}
                        {overdue ? " · Overdue" : ""}
                      </Typography>
                    </Stack>
                  )}

                  {task.attachments.length > 0 && (
                    <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap", gap: 1.5 }}>
                      {task.attachments.map((a) => (
                        <AttachmentView key={a.url} attachment={a} />
                      ))}
                    </Stack>
                  )}

                  <Stack direction="row" spacing={2} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                    <TextField
                      select
                      size="small"
                      label="Status"
                      value={task.status}
                      disabled={!canSetStatus}
                      helperText={canSetStatus ? undefined : "Only an assignee can change this"}
                      onChange={(e) =>
                        void handleQuickStatusChange(task, e.target.value as TaskStatus)
                      }
                      sx={{ minWidth: 150 }}
                    >
                      <MenuItem value="todo">To do</MenuItem>
                      <MenuItem value="in_progress">In progress</MenuItem>
                      <MenuItem value="done">Done</MenuItem>
                    </TextField>
                    <Typography variant="caption" color="text.secondary">
                      Submitted by {task.created_by.full_name || task.created_by.email}
                    </Typography>
                  </Stack>

                  {task.assignees.length > 0 && (
                    <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
                      {task.assignees.map((a) => (
                        <Chip
                          key={a.id}
                          size="small"
                          variant="outlined"
                          avatar={
                            <Avatar src={a.avatar_url ?? undefined}>
                              {(a.full_name || a.email).charAt(0).toUpperCase()}
                            </Avatar>
                          }
                          label={a.full_name || a.email}
                        />
                      ))}
                    </Stack>
                  )}
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingTask ? "Edit task" : "New task"}</DialogTitle>
        <Box component="form" onSubmit={(e) => void handleSubmit(e)}>
          <DialogContent>
            <Stack spacing={2}>
              {formError && <Alert severity="error">{formError}</Alert>}
              <TextField
                label="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                autoFocus
                fullWidth
              />
              <Box>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: "center", justifyContent: "space-between", mb: 1 }}
                >
                  <Typography variant="subtitle2">Description</Typography>
                  <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={descMode}
                    onChange={(_, value) => value && setDescMode(value)}
                  >
                    <ToggleButton value="write" sx={{ textTransform: "none", py: 0.25 }}>
                      Write
                    </ToggleButton>
                    <ToggleButton value="preview" sx={{ textTransform: "none", py: 0.25 }}>
                      Preview
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Stack>
                {descMode === "write" ? (
                  <TextField
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    fullWidth
                    multiline
                    minRows={4}
                    placeholder="Full details of the task… Markdown supported."
                    helperText="Markdown supported — headings, **bold**, lists, `code`, links, tables."
                  />
                ) : (
                  <Box
                    sx={{
                      minHeight: 120,
                      p: 1.5,
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1,
                    }}
                  >
                    {description.trim() ? (
                      <Markdown>{description}</Markdown>
                    ) : (
                      <Typography variant="body2" color="text.disabled">
                        Nothing to preview.
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  select
                  label="Priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  fullWidth
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="urgent">Urgent</MenuItem>
                </TextField>
                <TextField
                  type="date"
                  label="Deadline"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Stack>
              {editingTask && (
                <TextField
                  select
                  label="Status"
                  value={status}
                  disabled={!editingTask.assignees.some((a) => a.id === currentUserId)}
                  helperText={
                    editingTask.assignees.some((a) => a.id === currentUserId)
                      ? undefined
                      : "Only an assignee can change the status"
                  }
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  fullWidth
                >
                  <MenuItem value="todo">To do</MenuItem>
                  <MenuItem value="in_progress">In progress</MenuItem>
                  <MenuItem value="done">Done</MenuItem>
                </TextField>
              )}
              <Autocomplete
                multiple
                options={memberOptions}
                value={assignees}
                onChange={(_, value) => setAssignees(value)}
                getOptionLabel={(option) => option.full_name || option.email}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderInput={(params) => (
                  <TextField {...params} label="Assignees" placeholder="Team members" />
                )}
              />

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Attachments
                </Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<ImageIcon />}
                    disabled={uploading}
                    onClick={() => imageInputRef.current?.click()}
                  >
                    Image
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<MicIcon />}
                    disabled={uploading}
                    onClick={() => audioInputRef.current?.click()}
                  >
                    Voice
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<VideocamIcon />}
                    disabled={uploading}
                    onClick={() => videoInputRef.current?.click()}
                  >
                    Video
                  </Button>
                  {uploading && (
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      <CircularProgress size={18} />
                      <Typography variant="caption" color="text.secondary">
                        Uploading…
                      </Typography>
                    </Stack>
                  )}
                </Stack>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept={IMAGE_ACCEPT}
                  multiple
                  hidden
                  onChange={(e) => void handleUpload(e)}
                />
                <input
                  ref={audioInputRef}
                  type="file"
                  accept={AUDIO_ACCEPT}
                  multiple
                  hidden
                  onChange={(e) => void handleUpload(e)}
                />
                <input
                  ref={videoInputRef}
                  type="file"
                  accept={VIDEO_ACCEPT}
                  multiple
                  hidden
                  onChange={(e) => void handleUpload(e)}
                />

                {attachments.length > 0 && (
                  <Stack spacing={1} sx={{ mt: 1.5 }}>
                    {attachments.map((a) => (
                      <Paper
                        key={a.url}
                        variant="outlined"
                        sx={{ p: 1, display: "flex", alignItems: "center", gap: 1 }}
                      >
                        {a.kind === "image" ? (
                          <Box
                            component="img"
                            src={a.url}
                            alt={a.filename}
                            sx={{
                              width: 36,
                              height: 36,
                              objectFit: "cover",
                              borderRadius: 0.5,
                              flexShrink: 0,
                            }}
                          />
                        ) : a.kind === "audio" ? (
                          <MicIcon fontSize="small" color="action" />
                        ) : a.kind === "video" ? (
                          <VideocamIcon fontSize="small" color="action" />
                        ) : (
                          <AttachFileIcon fontSize="small" color="action" />
                        )}
                        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                          <Typography variant="body2" noWrap>
                            {a.filename}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatBytes(a.size)}
                          </Typography>
                        </Box>
                        <Tooltip title="Preview">
                          <IconButton size="small" onClick={() => setPreviewAttachment(a)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Remove">
                          <IconButton size="small" onClick={() => removeAttachment(a.url)}>
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting || uploading || !title.trim()}
            >
              {submitting
                ? editingTask
                  ? "Saving…"
                  : "Submitting…"
                : editingTask
                  ? "Save"
                  : "Submit"}
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
        <DialogTitle>Delete task</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {deleteError && <Alert severity="error">{deleteError}</Alert>}
            <DialogContentText>
              Are you sure you want to delete <strong>{deleteTarget?.title}</strong>? This
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

      <Dialog
        open={Boolean(previewAttachment)}
        onClose={() => setPreviewAttachment(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography component="span" noWrap sx={{ fontWeight: 600, mr: 2 }}>
            {previewAttachment?.filename}
          </Typography>
          <IconButton aria-label="Close preview" onClick={() => setPreviewAttachment(null)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {previewAttachment?.kind === "image" && (
            <Box
              component="img"
              src={previewAttachment.url}
              alt={previewAttachment.filename}
              sx={{ display: "block", mx: "auto", maxWidth: "100%", maxHeight: "70vh" }}
            />
          )}
          {previewAttachment?.kind === "audio" && (
            <audio controls autoPlay style={{ width: "100%" }} src={previewAttachment.url}>
              <track kind="captions" />
            </audio>
          )}
          {previewAttachment?.kind === "video" && (
            <Box
              component="video"
              controls
              autoPlay
              src={previewAttachment.url}
              sx={{ display: "block", mx: "auto", maxWidth: "100%", maxHeight: "70vh" }}
            />
          )}
          {previewAttachment?.kind === "file" && (
            <Link href={previewAttachment.url} target="_blank" rel="noopener">
              Open {previewAttachment.filename}
            </Link>
          )}
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
