"use client";

import { useEffect, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ImageIcon from "@mui/icons-material/Image";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import VideocamIcon from "@mui/icons-material/Videocam";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { PickerDay, type PickerDayProps } from "@mui/x-date-pickers/PickerDay";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import dayjs, { Dayjs } from "dayjs";

import { ApiError } from "@/lib/api/client";
import { teamsApi } from "@/lib/api/teams";
import type { Task, TaskAttachment } from "@/types/task";
import type { Team } from "@/types/team";
import type { WorkLogEntry } from "@/types/work-log";

import { AttachmentView } from "./attachment-view";

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const VIDEO_ACCEPT = "video/mp4,video/webm,video/quicktime,video/ogg";

const NONE = "__none__"; // sentinel for the "no task" option in the select

type State =
  | { kind: "loading" }
  | { kind: "ok"; entries: WorkLogEntry[] }
  | { kind: "error"; message: string };

function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatTime(iso: string): string {
  return dayjs(iso).format("h:mm A");
}

/** Local-time Monday 00:00 of the week containing `d`. */
function startOfWeek(d: Dayjs): Dayjs {
  // dayjs' `day()` is 0 = Sunday, so shift Sunday back to the *previous* Monday.
  const offset = d.day() === 0 ? -6 : 1 - d.day();
  return d.add(offset, "day").startOf("day");
}

function minutesInRange(entries: WorkLogEntry[], from: Dayjs, to: Dayjs): number {
  return entries
    .filter((e) => {
      const t = dayjs(e.started_at);
      return !t.isBefore(from) && t.isBefore(to);
    })
    .reduce((sum, e) => sum + e.minutes, 0);
}

/** Minutes logged per local calendar day, keyed YYYY-MM-DD. */
function minutesByDay(entries: WorkLogEntry[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    const key = dayjs(entry.started_at).format("YYYY-MM-DD");
    totals.set(key, (totals.get(key) ?? 0) + entry.minutes);
  }
  return totals;
}

/** Extra prop threaded into the day slot via `slotProps.day`. */
type LoggedDayProps = PickerDayProps & { loggedDays?: Map<string, number> };

/** Calendar day cell, dotted when hours were logged that day. */
function LoggedDay(props: LoggedDayProps) {
  const { loggedDays, day, outsideCurrentMonth, ...other } = props;
  const hasEntries =
    !outsideCurrentMonth && (loggedDays?.get(day.format("YYYY-MM-DD")) ?? 0) > 0;

  return (
    <Badge
      overlap="circular"
      variant="dot"
      color="primary"
      invisible={!hasEntries}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
    >
      <PickerDay day={day} outsideCurrentMonth={outsideCurrentMonth} {...other} />
    </Badge>
  );
}

export function WorkLogTab({
  team,
  token,
  currentUserId,
  hoursPerWeek,
}: {
  team: Team;
  token: string;
  currentUserId: string;
  /** The member's weekly hour target, from their team work arrangement. */
  hoursPerWeek: number | null;
}) {
  const [state, setState] = useState<State>({ kind: "loading" });
  // Tasks assigned to me on this team — the options for linking an entry.
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs().startOf("day"));
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
      .then((tasks) =>
        setMyTasks(tasks.filter((t) => t.assignees.some((a) => a.id === currentUserId))),
      )
      .catch(() => setMyTasks([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, team.id, currentUserId]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await teamsApi.removeWorkLog(token, team.id, deleteTarget.id);
    } finally {
      setDeleteTarget(null);
      load();
    }
  };

  const entries = state.kind === "ok" ? state.entries : [];
  const loggedDays = minutesByDay(entries);

  // Entries are newest-first from the API; within a day, read them chronologically.
  const dayEntries = entries
    .filter((e) => dayjs(e.started_at).isSame(selectedDate, "day"))
    .sort((a, b) => dayjs(a.started_at).valueOf() - dayjs(b.started_at).valueOf());
  const dayMinutes = dayEntries.reduce((sum, e) => sum + e.minutes, 0);

  const weekStart = startOfWeek(dayjs());
  const weekMinutes = minutesInRange(entries, weekStart, weekStart.add(7, "day"));
  const targetMinutes = hoursPerWeek != null ? hoursPerWeek * 60 : null;
  const remainingMinutes = targetMinutes != null ? targetMinutes - weekMinutes : null;
  const weekProgress =
    targetMinutes != null && targetMinutes > 0
      ? Math.min(100, Math.round((weekMinutes / targetMinutes) * 100))
      : 0;
  const overTarget = remainingMinutes !== null && remainingMinutes < 0;

  return (
    <Stack direction={{ xs: "column", md: "row" }} spacing={3} sx={{ alignItems: "flex-start" }}>
      {/* --- Left: the selected day's entries -------------------------------- */}
      <Stack spacing={2} sx={{ flexGrow: 1, minWidth: 0, width: "100%" }}>
        {targetMinutes != null && (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={1}>
              <Stack
                direction="row"
                sx={{ justifyContent: "space-between", alignItems: "baseline" }}
              >
                <Typography variant="subtitle2">This week</Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatMinutes(weekMinutes)} of {formatMinutes(targetMinutes)}
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={weekProgress}
                color={overTarget ? "warning" : "primary"}
                sx={{ borderRadius: 1, height: 8 }}
              />
              <Typography
                variant="body2"
                color={overTarget ? "warning.main" : "text.secondary"}
              >
                {remainingMinutes === null
                  ? " "
                  : remainingMinutes > 0
                    ? `${formatMinutes(remainingMinutes)} remaining this week`
                    : remainingMinutes === 0
                      ? "Weekly target reached"
                      : `${formatMinutes(-remainingMinutes)} over your weekly target`}
              </Typography>
            </Stack>
          </Paper>
        )}

        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
          <Box>
            <Typography sx={{ fontWeight: 600 }}>
              {selectedDate.format("dddd, MMM D, YYYY")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {dayEntries.length > 0
                ? `${formatMinutes(dayMinutes)} logged`
                : "Nothing logged on this day"}
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
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

        {state.kind === "ok" && dayEntries.length === 0 && (
          <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">
              No time logged on this day. Pick another date on the calendar, or click
              &quot;Log time&quot;.
            </Typography>
          </Paper>
        )}

        {dayEntries.map((entry) => (
          <Paper key={entry.id} variant="outlined" sx={{ p: 2 }}>
            <Stack
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
                {entry.attachments.length > 0 && (
                  <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap", gap: 1.5, mt: 1 }}>
                    {entry.attachments.map((a) => (
                      <AttachmentView key={a.url} attachment={a} />
                    ))}
                  </Stack>
                )}
              </Box>
              <Stack direction="row" spacing={0.5}>
                <IconButton
                  size="small"
                  aria-label="Edit entry"
                  onClick={() => {
                    setEditing(entry);
                    setDialogOpen(true);
                  }}
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
          </Paper>
        ))}
      </Stack>

      {/* --- Right: the calendar --------------------------------------------- */}
      <Paper variant="outlined" sx={{ flexShrink: 0 }}>
        <DateCalendar
          value={selectedDate}
          onChange={(value) => value && setSelectedDate(value.startOf("day"))}
          slots={{ day: LoggedDay }}
          // The cast is MUI's own pattern for passing custom props to a slot:
          // `slotProps.day` is typed against the built-in day, which knows
          // nothing about `loggedDays`.
          slotProps={{ day: { loggedDays } as Partial<LoggedDayProps> }}
        />
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", px: 2, pb: 1.5 }}
        >
          Dotted days have logged hours.
        </Typography>
      </Paper>

      {dialogOpen && (
        <WorkLogDialog
          key={editing?.id ?? `new-${selectedDate.format("YYYY-MM-DD")}`}
          teamId={team.id}
          token={token}
          entry={editing}
          defaultDate={selectedDate}
          tasks={myTasks}
          onClose={() => setDialogOpen(false)}
          onSaved={(savedOn) => {
            setDialogOpen(false);
            setSelectedDate(savedOn.startOf("day"));
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

/** Combine a calendar date with a wall-clock time into one instant. */
function combine(date: Dayjs, time: Dayjs): Dayjs {
  return date
    .startOf("day")
    .hour(time.hour())
    .minute(time.minute())
    .second(0)
    .millisecond(0);
}

function WorkLogDialog({
  teamId,
  token,
  entry,
  defaultDate,
  tasks,
  onClose,
  onSaved,
}: {
  teamId: string;
  token: string;
  entry: WorkLogEntry | null;
  defaultDate: Dayjs;
  tasks: Task[];
  onClose: () => void;
  onSaved: (savedOn: Dayjs) => void;
}) {
  // An entry is a date plus a start and end time on *that* date, so it can't
  // run past midnight — matching "an entry can't exceed one day".
  const [date, setDate] = useState<Dayjs | null>(
    entry ? dayjs(entry.started_at).startOf("day") : defaultDate,
  );
  const [start, setStart] = useState<Dayjs | null>(
    entry ? dayjs(entry.started_at) : dayjs().minute(0).second(0).millisecond(0),
  );
  const [end, setEnd] = useState<Dayjs | null>(entry ? dayjs(entry.ended_at) : null);
  const [description, setDescription] = useState(entry?.description ?? "");
  const [taskId, setTaskId] = useState(entry?.task_id ?? NONE);
  const [attachments, setAttachments] = useState<TaskAttachment[]>(entry?.attachments ?? []);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const hasVideo = attachments.some((a) => a.kind === "video");

  const datesValid =
    date !== null && date.isValid() && start !== null && start.isValid() && end !== null && end.isValid();

  const startedAt = datesValid ? combine(date, start) : null;
  const endedAt = datesValid ? combine(date, end) : null;
  const durationMinutes =
    startedAt && endedAt ? endedAt.diff(startedAt, "minute") : null;

  // Both times land on the same date, so the only failure left is end ≤ start
  // (which is also what an overnight shift would look like).
  const rangeError =
    durationMinutes !== null && durationMinutes <= 0
      ? "The end time must be after the start time, on the same day."
      : null;

  const canSubmit =
    datesValid &&
    description.trim().length > 0 &&
    rangeError === null &&
    !submitting &&
    !uploading;

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = ""; // allow re-picking the same file
    if (files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      for (const file of files) {
        const uploaded = await teamsApi.uploadWorkLogAttachment(token, teamId, file);
        setAttachments((prev) => [...prev, uploaded]);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to upload the image.");
    } finally {
      setUploading(false);
    }
  };

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const uploaded = await teamsApi.uploadWorkLogAttachment(token, teamId, file);
      // Only one video per entry — a newly picked video replaces the last one.
      setAttachments((prev) => [...prev.filter((a) => a.kind !== "video"), uploaded]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to upload the video.");
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (url: string) => {
    setAttachments((prev) => prev.filter((a) => a.url !== url));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || !startedAt || !endedAt) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        started_at: startedAt.toISOString(),
        ended_at: endedAt.toISOString(),
        description: description.trim(),
        task_id: taskId === NONE ? null : taskId,
        attachments,
      };
      if (entry) {
        await teamsApi.updateWorkLog(token, teamId, entry.id, payload);
      } else {
        await teamsApi.createWorkLog(token, teamId, payload);
      }
      onSaved(startedAt);
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

            <DatePicker
              label="Date"
              value={date}
              onChange={setDate}
              slotProps={{ textField: { fullWidth: true, required: true } }}
            />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TimePicker
                label="Start time"
                value={start}
                onChange={setStart}
                slotProps={{ textField: { fullWidth: true, required: true } }}
              />
              <TimePicker
                label="End time"
                value={end}
                onChange={setEnd}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                    error: rangeError !== null,
                    helperText:
                      rangeError ??
                      (durationMinutes !== null && durationMinutes > 0
                        ? formatMinutes(durationMinutes)
                        : " "),
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
                  Add images
                </Button>
                <Tooltip title={hasVideo ? "Replaces the current video" : ""}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<VideocamIcon />}
                    disabled={uploading}
                    onClick={() => videoInputRef.current?.click()}
                  >
                    {hasVideo ? "Replace video" : "Add video"}
                  </Button>
                </Tooltip>
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
                onChange={(e) => void handleImageUpload(e)}
              />
              <input
                ref={videoInputRef}
                type="file"
                accept={VIDEO_ACCEPT}
                hidden
                onChange={(e) => void handleVideoUpload(e)}
              />

              {attachments.length > 0 && (
                <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap", gap: 1.5, mt: 1.5 }}>
                  {attachments.map((a) => (
                    <Box key={a.url} sx={{ position: "relative" }}>
                      <AttachmentView attachment={a} />
                      <IconButton
                        size="small"
                        aria-label={`Remove ${a.filename}`}
                        onClick={() => removeAttachment(a.url)}
                        sx={{
                          position: "absolute",
                          top: 2,
                          right: 2,
                          bgcolor: "background.paper",
                          "&:hover": { bgcolor: "background.paper" },
                        }}
                      >
                        <CloseIcon fontSize="inherit" />
                      </IconButton>
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
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
