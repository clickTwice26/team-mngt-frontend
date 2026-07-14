"use client";

import { useEffect, useState } from "react";
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
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";

import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import dayjs, { Dayjs } from "dayjs";

import { AttachmentPicker } from "@/components/attachment-picker";
import { Markdown } from "@/components/markdown";
import { ApiError } from "@/lib/api/client";
import { teamsApi } from "@/lib/api/teams";

import { AttachmentView } from "./attachment-view";
import {
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  formatDeadline,
  isOverdue,
} from "./task-meta";
import type { Membership, MembershipUser } from "@/types/membership";
import type { Task, TaskAttachment, TaskPriority, TaskStatus } from "@/types/task";
import type { Team } from "@/types/team";



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
  const [deadline, setDeadline] = useState<Dayjs | null>(null);
  const [assignees, setAssignees] = useState<MembershipUser[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
    setDeadline(null);
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
    setDeadline(task.deadline ? dayjs(task.deadline) : null);
    setAssignees(task.assignees);
    setAttachments(task.attachments);
    setFormError(null);
    setDialogOpen(true);
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
        // The picker works in local time; the API stores the UTC instant.
        deadline: deadline && deadline.isValid() ? deadline.toISOString() : null,
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
                <DateTimePicker
                  label="Deadline"
                  value={deadline}
                  onChange={setDeadline}
                  ampm
                  slotProps={{
                    textField: { fullWidth: true },
                    // Without this there's no way back to "no deadline" once
                    // one is set.
                    field: { clearable: true, onClear: () => setDeadline(null) },
                  }}
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

              <AttachmentPicker
                value={attachments}
                onChange={setAttachments}
                upload={(file) => teamsApi.uploadTaskAttachment(token, team.id, file)}
                allow={["image", "audio", "video", "markdown", "file"]}
                onUploadingChange={setUploading}
              />
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

    </Stack>
  );
}
