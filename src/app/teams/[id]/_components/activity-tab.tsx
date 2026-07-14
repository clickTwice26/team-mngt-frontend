"use client";

import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AssignmentIcon from "@mui/icons-material/Assignment";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EditIcon from "@mui/icons-material/Edit";
import EventIcon from "@mui/icons-material/Event";
import GroupIcon from "@mui/icons-material/Group";
import LockIcon from "@mui/icons-material/Lock";
import ScheduleIcon from "@mui/icons-material/Schedule";
import SearchIcon from "@mui/icons-material/Search";
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
  { value: "discussion", label: "Discussion" },
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
  const [search, setSearch] = useState("");
  // What's actually sent. Debounced so typing doesn't fire a request per key.
  const [query, setQuery] = useState("");

  useEffect(() => {
    const id = setTimeout(() => {
      // A new search must restart at page 1 — otherwise you land on "page 3" of
      // a result set that may only have one page. Reset here rather than in a
      // second effect, which would be a setState cascade.
      setQuery((prev) => {
        const next = search.trim();
        if (next !== prev) setOffset(0);
        return next;
      });
    }, 300);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    queueMicrotask(() => {
      setState({ kind: "loading" });
      teamsApi
        .listActivity(token, team.id, {
          q: query || undefined,
          subjectType: filter === "all" ? undefined : filter,
          limit: PAGE_SIZE,
          offset,
        })
        .then((page) => setState({ kind: "ok", items: page.items, total: page.total }))
        .catch((err: unknown) =>
          setState({
            kind: "error",
            message:
              err instanceof ApiError ? err.message : "Failed to load the activity log.",
          }),
        );
    });
  }, [token, team.id, offset, query, filter]);

  // Search and filtering happen server-side, over the whole log rather than the
  // page in hand — the entry you're hunting for is rarely on the page you
  // happen to be on.
  const items = state.kind === "ok" ? state.items : [];
  const total = state.kind === "ok" ? state.total : 0;
  const groups = groupByDay(items);
  const shownTo = offset + items.length;

  return (
    <Stack spacing={2} sx={{ maxWidth: 860 }}>
      <Alert severity="info" icon={<LockIcon fontSize="inherit" />}>
        Every action on this team is recorded here permanently. Entries can&apos;t be
        edited or deleted — not by anyone, including you.
      </Alert>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ alignItems: { sm: "center" } }}
      >
        <TextField
          size="small"
          placeholder="Search the log…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flexGrow: 1, minWidth: 220 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" aria-label="Clear search" onClick={() => setSearch("")}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : undefined,
            },
          }}
        />
        <TextField
          select
          size="small"
          label="Show"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setOffset(0);
          }}
          sx={{ minWidth: 180 }}
        >
          {FILTERS.map((f) => (
            <MenuItem key={f.value} value={f.value}>
              {f.label}
            </MenuItem>
          ))}
        </TextField>
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
          {state.kind === "loading" ? "…" : `${total} ${total === 1 ? "entry" : "entries"}`}
        </Typography>
      </Stack>

      {state.kind === "error" && <Alert severity="error">{state.message}</Alert>}

      {state.kind === "loading" && (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <CircularProgress size={20} />
          <Typography color="text.secondary">Loading…</Typography>
        </Stack>
      )}

      {state.kind === "ok" && items.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary">
            {query || filter !== "all"
              ? "No entries match that search."
              : "Nothing has happened on this team yet."}
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

      {(offset > 0 || shownTo < total) && (
        <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between" }}>
          <Button
            size="small"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          >
            Newer
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>
            {offset + 1}–{shownTo} of {total}
          </Typography>
          <Button
            size="small"
            disabled={shownTo >= total}
            onClick={() => setOffset(offset + PAGE_SIZE)}
          >
            Older
          </Button>
        </Stack>
      )}
    </Stack>
  );
}
