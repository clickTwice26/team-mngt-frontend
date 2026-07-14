"use client";

import { useEffect, useState } from "react";
import NextLink from "next/link";
import { useParams, useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import dayjs, { Dayjs } from "dayjs";

import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/context/auth-context";
import { ApiError } from "@/lib/api/client";
import { teamsApi } from "@/lib/api/teams";
import type { Membership } from "@/types/membership";
import type { WorkLogEntry } from "@/types/work-log";

import { AttachmentView } from "../../../_components/attachment-view";
import { LoggedDaysCalendar } from "../../../_components/logged-days-calendar";

type State =
  | { kind: "loading" }
  | { kind: "ok"; entries: WorkLogEntry[]; membership: Membership | null }
  | { kind: "error"; message: string };

function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function startOfWeek(d: Dayjs): Dayjs {
  const offset = d.day() === 0 ? -6 : 1 - d.day();
  return d.add(offset, "day").startOf("day");
}

/**
 * A member's work log, read-only, browsable by day.
 *
 * Founders (and the developer) can look up anyone's hours; the member's own
 * editable view lives on the team's "My Hours" tab. Nothing here can change a
 * record — an oversight surface that lets you edit what you're overseeing isn't
 * oversight.
 */
export default function MemberHoursPage() {
  const { id: teamId, userId } = useParams<{ id: string; userId: string }>();
  const router = useRouter();
  const { user, token, loading: authLoading, isAuthenticated } = useAuth();

  const [state, setState] = useState<State>({ kind: "loading" });
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs().startOf("day"));

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace("/login");
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!token) return;
    queueMicrotask(() => {
      Promise.all([
        teamsApi.listWorkLogs(token, teamId, userId),
        teamsApi.listMembers(token, teamId),
      ])
        .then(([entries, members]) =>
          setState({
            kind: "ok",
            entries,
            membership: members.find((m) => m.user.id === userId) ?? null,
          }),
        )
        .catch((err: unknown) =>
          setState({
            kind: "error",
            message:
              err instanceof ApiError ? err.message : "Failed to load the work log.",
          }),
        );
    });
  }, [token, teamId, userId]);

  const backHref = `/teams/${teamId}?tab=members`;

  if (authLoading || !user || state.kind === "loading") {
    return (
      <AppShell>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <CircularProgress size={20} />
          <Typography color="text.secondary">Loading…</Typography>
        </Stack>
      </AppShell>
    );
  }

  if (state.kind === "error") {
    return (
      <AppShell>
        <Stack spacing={2} sx={{ maxWidth: 720 }}>
          <Alert severity="error">{state.message}</Alert>
          <Box>
            <Button component={NextLink} href={backHref} startIcon={<ArrowBackIcon />}>
              Back to members
            </Button>
          </Box>
        </Stack>
      </AppShell>
    );
  }

  const { entries, membership } = state;
  const person = membership?.user;
  const hoursPerWeek = membership?.work.hours_per_week ?? null;
  const targetMinutes = hoursPerWeek != null ? hoursPerWeek * 60 : null;

  const weekStart = startOfWeek(dayjs());
  const weekEnd = weekStart.add(7, "day");
  const weekMinutes = entries
    .filter((e) => {
      const t = dayjs(e.started_at);
      return !t.isBefore(weekStart) && t.isBefore(weekEnd);
    })
    .reduce((sum, e) => sum + e.minutes, 0);
  const totalMinutes = entries.reduce((sum, e) => sum + e.minutes, 0);

  // The chosen day only — the calendar is how you move between days.
  const dayEntries = entries
    .filter((e) => dayjs(e.started_at).isSame(selectedDate, "day"))
    .sort((a, b) => dayjs(a.started_at).valueOf() - dayjs(b.started_at).valueOf());
  const dayMinutes = dayEntries.reduce((sum, e) => sum + e.minutes, 0);

  return (
    <AppShell>
      <Stack spacing={3} sx={{ maxWidth: 1100 }}>
        <Box>
          <Button
            component={NextLink}
            href={backHref}
            startIcon={<ArrowBackIcon />}
            size="small"
          >
            Back to members
          </Button>
        </Box>

        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <Avatar src={person?.avatar_url ?? undefined} sx={{ width: 48, height: 48 }}>
            {(person?.full_name || person?.email || "?").charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
              {person?.full_name || person?.email || "Member"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Logged hours · {formatMinutes(totalMinutes)} in total
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <Chip size="small" variant="outlined" label="Read-only" />
        </Stack>

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={3}
          sx={{ alignItems: "flex-start" }}
        >
          {/* --- Left: the chosen day ----------------------------------------- */}
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
                    value={Math.min(100, Math.round((weekMinutes / targetMinutes) * 100))}
                    color={weekMinutes > targetMinutes ? "warning" : "primary"}
                    sx={{ borderRadius: 1, height: 8 }}
                  />
                </Stack>
              </Paper>
            )}

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

            {dayEntries.length === 0 && (
              <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
                <Typography color="text.secondary">
                  {entries.length === 0
                    ? "This member hasn't logged any hours yet."
                    : "Nothing on this day. Pick another date on the calendar."}
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
                      {dayjs(entry.started_at).format("h:mm A")} –{" "}
                      {dayjs(entry.ended_at).format("h:mm A")}
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
                      <Stack
                        direction="row"
                        spacing={1.5}
                        sx={{ flexWrap: "wrap", gap: 1.5, mt: 1 }}
                      >
                        {entry.attachments.map((a) => (
                          <AttachmentView key={a.url} attachment={a} />
                        ))}
                      </Stack>
                    )}
                  </Box>
                  {/* A founder can query an entry, but not rewrite it. */}
                  <Button
                    size="small"
                    startIcon={<ChatBubbleOutlineIcon />}
                    component={NextLink}
                    href={`/teams/${teamId}/work-logs/${entry.id}`}
                    sx={{ flexShrink: 0 }}
                  >
                    Discuss
                  </Button>
                </Stack>
              </Paper>
            ))}
          </Stack>

          {/* --- Right: the calendar ------------------------------------------ */}
          <LoggedDaysCalendar
            entries={entries}
            value={selectedDate}
            onChange={setSelectedDate}
          />
        </Stack>
      </Stack>
    </AppShell>
  );
}
