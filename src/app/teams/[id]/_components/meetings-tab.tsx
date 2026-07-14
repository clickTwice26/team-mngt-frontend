"use client";

import { useEffect, useState } from "react";
import NextLink from "next/link";
import Alert from "@mui/material/Alert";
import Badge from "@mui/material/Badge";
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
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import ScheduleIcon from "@mui/icons-material/Schedule";
import VideocamIcon from "@mui/icons-material/Videocam";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { PickerDay, type PickerDayProps } from "@mui/x-date-pickers/PickerDay";
import dayjs, { Dayjs } from "dayjs";

import { AttachmentPicker } from "@/components/attachment-picker";
import { ApiError } from "@/lib/api/client";
import { teamsApi } from "@/lib/api/teams";

import { meetingStatus, useNow } from "./meeting-status";
import type { Meeting } from "@/types/meeting";
import type { TaskAttachment } from "@/types/task";
import type { Team } from "@/types/team";

type State =
  | { kind: "loading" }
  | { kind: "ok"; meetings: Meeting[] }
  | { kind: "error"; message: string };

const DURATIONS = [10, 15, 20, 30, 45, 60, 90, 120];

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** Days that have a meeting, keyed YYYY-MM-DD. */
function meetingDays(meetings: Meeting[]): Set<string> {
  return new Set(meetings.map((m) => dayjs(m.scheduled_at).format("YYYY-MM-DD")));
}

/**
 * Join, but only while joining is possible.
 *
 * Once the meeting's window has passed the link is dead weight — it would drop
 * you into an empty call — so the button is replaced by a disabled "Meeting
 * ended" rather than left there to mislead.
 */
export function MeetingJoinButton({
  meeting,
  now,
  size = "small",
}: {
  meeting: Meeting;
  now: number;
  size?: "small" | "medium" | "large";
}) {
  const status = meetingStatus(meeting, now);

  if (status === "ended") {
    return (
      <Button size={size} variant="outlined" disabled startIcon={<EventBusyIcon />}>
        Meeting ended
      </Button>
    );
  }

  if (!meeting.meet_link) {
    // Nothing to join — an in-person meeting, or a link nobody added.
    return (
      <Chip
        size="small"
        variant="outlined"
        label={status === "live" ? "Happening now" : "No meeting link"}
        color={status === "live" ? "success" : "default"}
      />
    );
  }

  return (
    <Button
      size={size}
      variant="contained"
      color={status === "live" ? "success" : "primary"}
      startIcon={<VideocamIcon />}
      href={meeting.meet_link}
      target="_blank"
      rel="noopener"
    >
      {status === "live" ? "Join now" : "Join"}
    </Button>
  );
}

type ScheduledDayProps = PickerDayProps & { scheduled?: Set<string> };

/** Calendar day cell, dotted when a meeting is scheduled that day. */
function ScheduledDay(props: ScheduledDayProps) {
  const { scheduled, day, outsideCurrentMonth, ...other } = props;
  const has = !outsideCurrentMonth && (scheduled?.has(day.format("YYYY-MM-DD")) ?? false);
  return (
    <Badge
      overlap="circular"
      variant="dot"
      color="primary"
      invisible={!has}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
    >
      <PickerDay day={day} outsideCurrentMonth={outsideCurrentMonth} {...other} />
    </Badge>
  );
}

export function MeetingsTab({
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
  // Anyone on the team can call a meeting; only its organiser (or a super
  // admin) can move or cancel one others are planning around.
  const canManage = (meeting: Meeting) =>
    isSuperAdmin || meeting.created_by.id === currentUserId;
  const now = useNow();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs().startOf("day"));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Meeting | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Meeting | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = () => {
    setState({ kind: "loading" });
    teamsApi
      .listMeetings(token, team.id)
      .then((meetings) => setState({ kind: "ok", meetings }))
      .catch((err: unknown) =>
        setState({
          kind: "error",
          message: err instanceof ApiError ? err.message : "Failed to load meetings.",
        }),
      );
  };

  useEffect(() => {
    queueMicrotask(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, team.id]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      await teamsApi.removeMeeting(token, team.id, deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Failed to cancel the meeting.");
    }
  };

  const meetings = state.kind === "ok" ? state.meetings : [];
  const scheduled = meetingDays(meetings);

  const dayMeetings = meetings
    .filter((m) => dayjs(m.scheduled_at).isSame(selectedDate, "day"))
    .sort((a, b) => dayjs(a.scheduled_at).valueOf() - dayjs(b.scheduled_at).valueOf());

  return (
    <Stack direction={{ xs: "column", md: "row" }} spacing={3} sx={{ alignItems: "flex-start" }}>
      {/* --- Left: the selected day's meetings -------------------------------- */}
      <Stack spacing={2} sx={{ flexGrow: 1, minWidth: 0, width: "100%" }}>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
          <Box>
            <Typography sx={{ fontWeight: 600 }}>
              {selectedDate.format("dddd, MMM D, YYYY")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {dayMeetings.length > 0
                ? `${dayMeetings.length} meeting${dayMeetings.length === 1 ? "" : "s"}`
                : "No meetings scheduled"}
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
            Schedule
          </Button>
        </Stack>

        {state.kind === "loading" && (
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <CircularProgress size={20} />
            <Typography color="text.secondary">Loading…</Typography>
          </Stack>
        )}

        {state.kind === "error" && <Alert severity="error">{state.message}</Alert>}

        {state.kind === "ok" && dayMeetings.length === 0 && (
          <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">
              Nothing on this day. Pick another date on the calendar, or click
              &quot;Schedule&quot;.
            </Typography>
          </Paper>
        )}

        {dayMeetings.map((meeting) => (
          <Paper key={meeting.id} variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={1.5}>
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: "flex-start", justifyContent: "space-between" }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600 }}>{meeting.title}</Typography>
                  <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{ alignItems: "center", color: "text.secondary" }}
                  >
                    <ScheduleIcon fontSize="inherit" />
                    <Typography variant="caption">
                      {dayjs(meeting.scheduled_at).format("h:mm A")} ·{" "}
                      {formatDuration(meeting.duration_minutes)} · by{" "}
                      {meeting.created_by.id === currentUserId
                        ? "you"
                        : meeting.created_by.full_name || meeting.created_by.email}
                    </Typography>
                  </Stack>
                </Box>
                <Stack direction="row" spacing={0.5}>
                  <Tooltip title="Discussion">
                    <IconButton
                      size="small"
                      component={NextLink}
                      href={`/teams/${team.id}/meetings/${meeting.id}`}
                      aria-label={`Discussion for ${meeting.title}`}
                    >
                      <ChatBubbleOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {canManage(meeting) && (
                    <>
                      <IconButton
                        size="small"
                        aria-label="Edit meeting"
                        onClick={() => {
                          setEditing(meeting);
                          setDialogOpen(true);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        aria-label="Cancel meeting"
                        onClick={() => {
                          setDeleteError(null);
                          setDeleteTarget(meeting);
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </>
                  )}
                </Stack>
              </Stack>

              {meeting.topics.length > 0 && (
                <Box>
                  <Typography variant="overline" color="text.secondary">
                    Topics
                  </Typography>
                  <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                    {meeting.topics.map((topic) => (
                      <Typography component="li" variant="body2" key={topic}>
                        {topic}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              )}

              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
                <MeetingJoinButton meeting={meeting} now={now} />
                {meeting.attachments.length > 0 && (
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`${meeting.attachments.length} file${
                      meeting.attachments.length === 1 ? "" : "s"
                    }`}
                    component={NextLink}
                    href={`/teams/${team.id}/meetings/${meeting.id}`}
                    clickable
                  />
                )}
              </Stack>
            </Stack>
          </Paper>
        ))}
      </Stack>

      {/* --- Right: the calendar ---------------------------------------------- */}
      <Paper variant="outlined" sx={{ flexShrink: 0 }}>
        <DateCalendar
          value={selectedDate}
          onChange={(value) => value && setSelectedDate(value.startOf("day"))}
          slots={{ day: ScheduledDay }}
          slotProps={{ day: { scheduled } as Partial<ScheduledDayProps> }}
        />
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", px: 2, pb: 1.5 }}
        >
          Dotted days have a meeting.
        </Typography>
      </Paper>

      {dialogOpen && (
        <MeetingDialog
          key={editing?.id ?? `new-${selectedDate.format("YYYY-MM-DD")}`}
          teamId={team.id}
          token={token}
          meeting={editing}
          defaultDate={selectedDate}
          onClose={() => setDialogOpen(false)}
          onSaved={(savedOn) => {
            setDialogOpen(false);
            setSelectedDate(savedOn.startOf("day"));
            load();
          }}
        />
      )}

      <Dialog open={deleteTarget !== null} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Cancel this meeting?</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <DialogContentText>
              &quot;{deleteTarget?.title}&quot; and its discussion will be removed. This
              can&apos;t be undone.
            </DialogContentText>
            {deleteError && <Alert severity="error">{deleteError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Keep it</Button>
          <Button color="error" variant="contained" onClick={() => void handleDelete()}>
            Cancel meeting
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

// --- Schedule / edit dialog -----------------------------------------------------

function MeetingDialog({
  teamId,
  token,
  meeting,
  defaultDate,
  onClose,
  onSaved,
}: {
  teamId: string;
  token: string;
  meeting: Meeting | null;
  defaultDate: Dayjs;
  onClose: () => void;
  onSaved: (savedOn: Dayjs) => void;
}) {
  const [title, setTitle] = useState(meeting?.title ?? "Daily scrum");
  const [when, setWhen] = useState<Dayjs | null>(
    meeting
      ? dayjs(meeting.scheduled_at)
      : // Default to 10:00 on the day you're looking at — a scrum has a usual time.
        defaultDate.hour(10).minute(0).second(0).millisecond(0),
  );
  const [duration, setDuration] = useState(meeting?.duration_minutes ?? 15);
  // One topic per line is how an agenda is actually written.
  const [topics, setTopics] = useState((meeting?.topics ?? []).join("\n"));
  const [meetLink, setMeetLink] = useState(meeting?.meet_link ?? "");
  const [notes, setNotes] = useState(meeting?.notes ?? "");
  const [attachments, setAttachments] = useState<TaskAttachment[]>(
    meeting?.attachments ?? [],
  );
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const linkInvalid =
    meetLink.trim().length > 0 && !/^https?:\/\//i.test(meetLink.trim());

  const canSubmit =
    title.trim().length > 0 &&
    when !== null &&
    when.isValid() &&
    !linkInvalid &&
    !submitting &&
    !uploading;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || !when) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        title: title.trim(),
        scheduled_at: when.toISOString(),
        duration_minutes: duration,
        topics: topics
          .split("\n")
          .map((t) => t.trim())
          .filter(Boolean),
        meet_link: meetLink.trim() || null,
        notes: notes.trim() || null,
        attachments,
      };
      if (meeting) {
        await teamsApi.updateMeeting(token, teamId, meeting.id, payload);
      } else {
        await teamsApi.createMeeting(token, teamId, payload);
      }
      onSaved(when);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save the meeting.");
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <form onSubmit={(e) => void handleSubmit(e)}>
        <DialogTitle>{meeting ? "Edit meeting" : "Schedule a meeting"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              required
            />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <DateTimePicker
                label="When"
                value={when}
                onChange={setWhen}
                ampm
                slotProps={{ textField: { fullWidth: true, required: true } }}
              />
              <TextField
                select
                label="Duration"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                fullWidth
              >
                {DURATIONS.map((d) => (
                  <MenuItem key={d} value={d}>
                    {formatDuration(d)}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <TextField
              label="Topics"
              value={topics}
              onChange={(e) => setTopics(e.target.value)}
              placeholder={"What's blocking us\nSprint scope\nRelease date"}
              helperText="One topic per line."
              fullWidth
              multiline
              minRows={3}
            />

            <TextField
              label="Meeting link"
              value={meetLink}
              onChange={(e) => setMeetLink(e.target.value)}
              placeholder="https://meet.google.com/…"
              error={linkInvalid}
              helperText={linkInvalid ? "Must start with http:// or https://" : " "}
              fullWidth
            />

            <TextField
              label="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              fullWidth
              multiline
              minRows={2}
            />

            <AttachmentPicker
              value={attachments}
              onChange={setAttachments}
              upload={(file) => teamsApi.uploadMeetingAttachment(token, teamId, file)}
              allow={["image", "video", "markdown", "file"]}
              onUploadingChange={setUploading}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={!canSubmit}>
            {submitting ? "Saving…" : meeting ? "Save" : "Schedule"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
