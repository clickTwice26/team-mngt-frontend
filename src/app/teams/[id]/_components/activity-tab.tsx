"use client";

import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AssignmentIcon from "@mui/icons-material/Assignment";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EditIcon from "@mui/icons-material/Edit";
import EventIcon from "@mui/icons-material/Event";
import GroupIcon from "@mui/icons-material/Group";
import LockIcon from "@mui/icons-material/Lock";
import ScheduleIcon from "@mui/icons-material/Schedule";
import dayjs from "dayjs";

import { ApiError } from "@/lib/api/client";
import { teamsApi } from "@/lib/api/teams";
import type { Activity, ActivityAction } from "@/types/activity";
import type { Team } from "@/types/team";

const PAGE_SIZE = 50;

type State =
  | { kind: "loading" }
  | { kind: "ok"; items: Activity[]; total: number }
  | { kind: "error"; message: string };

/** Icon + colour per action, so the log can be skimmed rather than read. */
const LOOK: Record<
  ActivityAction,
  { icon: React.ReactNode; color: "default" | "primary" | "success" | "warning" | "error" }
> = {
  "team.updated": { icon: <EditIcon fontSize="small" />, color: "default" },
  "member.added": { icon: <GroupIcon fontSize="small" />, color: "success" },
  "member.removed": { icon: <GroupIcon fontSize="small" />, color: "error" },
  "member.work_changed": { icon: <ScheduleIcon fontSize="small" />, color: "primary" },
  "task.created": { icon: <AssignmentIcon fontSize="small" />, color: "success" },
  "task.updated": { icon: <EditIcon fontSize="small" />, color: "default" },
  "task.status_changed": { icon: <AssignmentIcon fontSize="small" />, color: "primary" },
  "task.deleted": { icon: <DeleteOutlineIcon fontSize="small" />, color: "error" },
  "meeting.scheduled": { icon: <EventIcon fontSize="small" />, color: "success" },
  "meeting.updated": { icon: <EditIcon fontSize="small" />, color: "default" },
  "meeting.rescheduled": { icon: <EventIcon fontSize="small" />, color: "warning" },
  "meeting.cancelled": { icon: <DeleteOutlineIcon fontSize="small" />, color: "error" },
  "work_log.created": { icon: <ScheduleIcon fontSize="small" />, color: "success" },
  "work_log.updated": { icon: <EditIcon fontSize="small" />, color: "default" },
  "work_log.deleted": { icon: <DeleteOutlineIcon fontSize="small" />, color: "error" },
  "comment.posted": { icon: <ChatBubbleOutlineIcon fontSize="small" />, color: "default" },
  "comment.deleted": { icon: <DeleteOutlineIcon fontSize="small" />, color: "error" },
};

const FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "Everything" },
  { value: "task", label: "Tasks" },
  { value: "meeting", label: "Meetings" },
  { value: "work_log", label: "Work logs" },
  { value: "member", label: "Members" },
  { value: "team", label: "Team" },
  { value: "comment", label: "Comments" },
];

/** Group entries under the day they happened. */
function groupByDay(items: Activity[]): { label: string; items: Activity[] }[] {
  const groups: { label: string; items: Activity[] }[] = [];
  const byKey = new Map<string, { label: string; items: Activity[] }>();
  for (const item of items) {
    const key = dayjs(item.created_at).format("YYYY-MM-DD");
    let group = byKey.get(key);
    if (!group) {
      group = { label: dayjs(item.created_at).format("dddd, MMM D, YYYY"), items: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}

export function ActivityTab({ team, token }: { team: Team; token: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [offset, setOffset] = useState(0);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    queueMicrotask(() => {
      setState({ kind: "loading" });
      teamsApi
        .listActivity(token, team.id, { limit: PAGE_SIZE, offset })
        .then((page) => setState({ kind: "ok", items: page.items, total: page.total }))
        .catch((err: unknown) =>
          setState({
            kind: "error",
            message:
              err instanceof ApiError ? err.message : "Failed to load the activity log.",
          }),
        );
    });
  }, [token, team.id, offset]);

  if (state.kind === "loading") {
    return (
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        <CircularProgress size={20} />
        <Typography color="text.secondary">Loading…</Typography>
      </Stack>
    );
  }

  if (state.kind === "error") {
    return <Alert severity="error">{state.message}</Alert>;
  }

  // Filtering is client-side over the loaded page: the log is a record, not a
  // search index, and a page is small.
  const visible =
    filter === "all"
      ? state.items
      : state.items.filter((a) => a.action.startsWith(`${filter}.`));

  const groups = groupByDay(visible);
  const shownTo = offset + state.items.length;

  return (
    <Stack spacing={2} sx={{ maxWidth: 860 }}>
      <Alert severity="info" icon={<LockIcon fontSize="inherit" />}>
        Every action on this team is recorded here permanently. Entries can&apos;t be
        edited or deleted — not by anyone, including you.
      </Alert>

      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
        <TextField
          select
          size="small"
          label="Show"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          {FILTERS.map((f) => (
            <MenuItem key={f.value} value={f.value}>
              {f.label}
            </MenuItem>
          ))}
        </TextField>
        <Typography variant="body2" color="text.secondary">
          {state.total} {state.total === 1 ? "entry" : "entries"}
        </Typography>
      </Stack>

      {visible.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary">
            {state.items.length === 0
              ? "Nothing has happened on this team yet."
              : "No entries of that kind on this page."}
          </Typography>
        </Paper>
      )}

      {groups.map((group) => (
        <Box key={group.label}>
          <Typography variant="overline" color="text.secondary">
            {group.label}
          </Typography>
          <Paper variant="outlined" sx={{ mt: 0.5 }}>
            <Stack divider={<Box sx={{ borderTop: "1px solid", borderColor: "divider" }} />}>
              {group.items.map((item) => {
                const look = LOOK[item.action];
                return (
                  <Stack
                    key={item.id}
                    direction="row"
                    spacing={1.5}
                    sx={{ p: 1.5, alignItems: "flex-start" }}
                  >
                    <Tooltip title={item.actor.full_name || item.actor.email}>
                      <Avatar
                        src={item.actor.avatar_url ?? undefined}
                        sx={{ width: 32, height: 32, flexShrink: 0 }}
                      >
                        {(item.actor.full_name || item.actor.email).charAt(0).toUpperCase()}
                      </Avatar>
                    </Tooltip>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography variant="body2">
                        <Box component="span" sx={{ fontWeight: 600 }}>
                          {item.actor.full_name || item.actor.email}
                        </Box>{" "}
                        {/* The summary was written when it happened, so it stays
                            true even after the subject is renamed or deleted. */}
                        {item.summary}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {dayjs(item.created_at).format("h:mm A")}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      variant="outlined"
                      color={look?.color ?? "default"}
                      icon={look?.icon as React.ReactElement}
                      label={item.action.split(".")[1].replace(/_/g, " ")}
                      sx={{ flexShrink: 0 }}
                    />
                  </Stack>
                );
              })}
            </Stack>
          </Paper>
        </Box>
      ))}

      {(offset > 0 || shownTo < state.total) && (
        <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between" }}>
          <Button
            size="small"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          >
            Newer
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>
            {offset + 1}–{shownTo} of {state.total}
          </Typography>
          <Button
            size="small"
            disabled={shownTo >= state.total}
            onClick={() => setOffset(offset + PAGE_SIZE)}
          >
            Older
          </Button>
        </Stack>
      )}
    </Stack>
  );
}
