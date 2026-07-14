"use client";

import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import dayjs, { Dayjs } from "dayjs";

import { ApiError } from "@/lib/api/client";
import { teamsApi } from "@/lib/api/teams";
import type { Task } from "@/types/task";
import type { Team } from "@/types/team";
import type { WorkLogEntry } from "@/types/work-log";

type State =
  | { kind: "loading" }
  | { kind: "ok"; entries: WorkLogEntry[] }
  | { kind: "error"; message: string };

const NONE = "__none__"; // sentinel for the "no task" option in the select

function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

interface DayGroup {
  key: string;
  label: string;
  minutes: number;
  entries: WorkLogEntry[];
}

/** Group already-newest-first entries by calendar day, preserving order. */
function groupByDay(entries: WorkLogEntry[]): DayGroup[] {
  const groups: DayGroup[] = [];
  const byKey = new Map<string, DayGroup>();
  for (const entry of entries) {
    const key = dayKey(entry.started_at);
    let group = byKey.get(key);
    if (!group) {
      group = { key, label: formatDay(entry.started_at), minutes: 0, entries: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.entries.push(entry);
    group.minutes += entry.minutes;
  }
  return groups;
}

export function WorkLogTab({
  team,
  token,
  currentUserId,
}: {
  team: Team;
  token: string;
  currentUserId: string;
}) {
  const [state, setState] = useState<State>({ kind: "loading" });
  // Tasks assigned to me on this team — the options for linking an entry.
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WorkLogEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkLogEntry | null>(null);

  const load = () => {
    setState({ kind: "loading" });
    teamsApi
      .listWorkLogs(token, team.id)
      .then((entries) => setState({ kind: "ok", entries }))
      .catch((err: unknown) =>
        setState({
          kind: "error",
          message: err instanceof ApiError ? err.message : "Failed to load your work log.",
        }),
      );
  };

  useEffect(() => {
    queueMicrotask(load);
    teamsApi
      .listTasks(token, team.id)
      .then((tasks) => setMyTasks(tasks.filter((t) => t.assignees.some((a) => a.id === currentUserId))))
      .catch(() => setMyTasks([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, team.id, currentUserId]);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (entry: WorkLogEntry) => {
    setEditing(entry);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await teamsApi.removeWorkLog(token, team.id, deleteTarget.id);
    } finally {
      setDeleteTarget(null);
      load();
    }
  };

  const groups = state.kind === "ok" ? groupByDay(state.entries) : [];
  const totalMinutes = groups.reduce((sum, g) => sum + g.minutes, 0);

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="body2" color="text.secondary">
          {state.kind === "ok" && state.entries.length > 0
            ? `${formatMinutes(totalMinutes)} logged across ${groups.length} ${
                groups.length === 1 ? "day" : "days"
              }`
            : "Log the hours you work on this team."}
        </Typography>
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={openCreate}>
          Log time
        </Button>
      </Stack>

      {state.kind === "loading" && (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <CircularProgress size={20} />
          <Typography color="text.secondary">Loading…</Typography>
        </Stack>
      )}

      {state.kind === "error" && <Alert severity="error">{state.message}</Alert>}

      {state.kind === "ok" && state.entries.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary">
            No time logged yet. Click &quot;Log time&quot; to add your first entry.
          </Typography>
        </Paper>
      )}

      {groups.map((group) => (
        <Paper key={group.key} variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "baseline" }}>
              <Typography sx={{ fontWeight: 600 }}>{group.label}</Typography>
              <Chip size="small" label={formatMinutes(group.minutes)} />
            </Stack>
            <Stack spacing={1}>
              {group.entries.map((entry) => (
                <Stack
                  key={entry.id}
                  direction="row"
                  spacing={1.5}
                  sx={{ alignItems: "flex-start", justifyContent: "space-between" }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {formatTime(entry.started_at)} – {formatTime(entry.ended_at)}
                      <Typography component="span" variant="caption" color="text.secondary">
                        {" "}
                        · {formatMinutes(entry.minutes)}
                      </Typography>
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                      {entry.description}
                    </Typography>
                    {entry.task_title && (
                      <Chip
                        size="small"
                        variant="outlined"
                        icon={<TaskAltIcon />}
                        label={entry.task_title}
                        sx={{ mt: 0.5 }}
                      />
                    )}
                  </Box>
                  <Stack direction="row" spacing={0.5}>
                    <IconButton
                      size="small"
                      aria-label="Edit entry"
                      onClick={() => openEdit(entry)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      aria-label="Delete entry"
                      onClick={() => setDeleteTarget(entry)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>
              ))}
            </Stack>
          </Stack>
        </Paper>
      ))}

      {dialogOpen && (
        <WorkLogDialog
          key={editing?.id ?? "new"}
          teamId={team.id}
          token={token}
          entry={editing}
          tasks={myTasks}
          onClose={() => setDialogOpen(false)}
          onSaved={() => {
            setDialogOpen(false);
            load();
          }}
        />
      )}

      <Dialog open={deleteTarget !== null} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete this entry?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">This can&apos;t be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button color="error" onClick={() => void handleDelete()}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

// --- Add / edit dialog ---------------------------------------------------------

function defaultStart(): Dayjs {
  return dayjs().set("minute", 0).set("second", 0).set("millisecond", 0);
}

function WorkLogDialog({
  teamId,
  token,
  entry,
  tasks,
  onClose,
  onSaved,
}: {
  teamId: string;
  token: string;
  entry: WorkLogEntry | null;
  tasks: Task[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [start, setStart] = useState<Dayjs | null>(
    entry ? dayjs(entry.started_at) : defaultStart(),
  );
  const [end, setEnd] = useState<Dayjs | null>(entry ? dayjs(entry.ended_at) : null);
  const [description, setDescription] = useState(entry?.description ?? "");
  const [taskId, setTaskId] = useState(entry?.task_id ?? NONE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const durationMinutes =
    start && start.isValid() && end && end.isValid() ? end.diff(start, "minute") : null;

  const rangeError =
    durationMinutes !== null && durationMinutes <= 0
      ? "The end time must be after the start time."
      : durationMinutes !== null && durationMinutes > 24 * 60
        ? "A single entry can't be longer than 24 hours."
        : null;

  const canSubmit =
    start !== null &&
    start.isValid() &&
    end !== null &&
    end.isValid() &&
    description.trim().length > 0 &&
    rangeError === null &&
    !submitting;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        started_at: start.toISOString(),
        ended_at: end.toISOString(),
        description: description.trim(),
        task_id: taskId === NONE ? null : taskId,
      };
      if (entry) {
        await teamsApi.updateWorkLog(token, teamId, entry.id, payload);
      } else {
        await teamsApi.createWorkLog(token, teamId, payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save the entry.");
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <form onSubmit={(e) => void handleSubmit(e)}>
        <DialogTitle>{entry ? "Edit entry" : "Log time"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <DateTimePicker
                label="Start"
                value={start}
                onChange={setStart}
                ampm
                slotProps={{ textField: { fullWidth: true, required: true } }}
              />
              <DateTimePicker
                label="End"
                value={end}
                onChange={setEnd}
                ampm
                minDateTime={start ?? undefined}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                    error: rangeError !== null,
                    helperText:
                      rangeError ?? (durationMinutes !== null ? formatMinutes(durationMinutes) : " "),
                  },
                }}
              />
            </Stack>

            <TextField
              label="What did you work on?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              required
              multiline
              minRows={2}
              slotProps={{ htmlInput: { maxLength: 2000 } }}
            />

            <TextField
              select
              label="Linked task (optional)"
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              fullWidth
              helperText={
                tasks.length === 0 ? "You have no tasks assigned on this team." : undefined
              }
            >
              <MenuItem value={NONE}>No task</MenuItem>
              {tasks.map((task) => (
                <MenuItem key={task.id} value={task.id}>
                  {task.title}
                </MenuItem>
              ))}
              {/* A previously-linked task that's no longer assignable should
                  still render, so editing an old entry doesn't silently drop it. */}
              {entry?.task_id &&
                !tasks.some((t) => t.id === entry.task_id) &&
                entry.task_title && (
                  <MenuItem value={entry.task_id}>{entry.task_title}</MenuItem>
                )}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={!canSubmit}>
            {submitting ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
