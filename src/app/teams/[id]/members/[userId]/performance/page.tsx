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
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import dayjs from "dayjs";

import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/context/auth-context";
import { ApiError } from "@/lib/api/client";
import { teamsApi } from "@/lib/api/teams";
import type { MemberPerformance } from "@/types/performance";

import {
  CategoryBars,
  CompletionRing,
  SERIES,
  StatTile,
  TimeBars,
} from "../../../_components/perf-charts";

type State =
  | { kind: "loading" }
  | { kind: "ok"; data: MemberPerformance }
  | { kind: "error"; message: string };

const MODE_LABELS: Record<string, string> = {
  task_based: "Task based",
  hourly: "Hourly basis",
  contractual: "Contractual",
};

function hours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function MemberPerformancePage() {
  const { id: teamId, userId } = useParams<{ id: string; userId: string }>();
  const router = useRouter();
  const { user, token, loading: authLoading, isAuthenticated } = useAuth();

  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace("/login");
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!token) return;
    teamsApi
      .getMemberPerformance(token, teamId, userId)
      .then((data) => setState({ kind: "ok", data }))
      .catch((err: unknown) =>
        setState({
          kind: "error",
          message:
            err instanceof ApiError ? err.message : "Failed to load performance.",
        }),
      );
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

  const { data } = state;
  const isHourly = data.work_mode === "hourly";
  const targetMinutes = data.hours_per_week != null ? data.hours_per_week * 60 : null;

  const dailyBars = data.daily_hours.map((d) => ({
    label: dayjs(d.day).format("ddd, MMM D"),
    tick: dayjs(d.day).format("D"),
    value: d.minutes,
    display: hours(d.minutes),
  }));

  const weeklyBars = data.weekly_hours.map((w) => ({
    label: `Week of ${dayjs(w.week_start).format("MMM D")}`,
    tick: dayjs(w.week_start).format("MMM D"),
    value: w.minutes,
    display: hours(w.minutes),
  }));

  return (
    <AppShell>
      <Stack spacing={3} sx={{ maxWidth: 1000 }}>
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
          <Avatar src={data.user.avatar_url ?? undefined} sx={{ width: 56, height: 56 }}>
            {(data.user.full_name || data.user.email).charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
              {data.user.full_name || data.user.email}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", mt: 0.5 }}>
              <Chip size="small" variant="outlined" label={MODE_LABELS[data.work_mode]} />
              {isHourly && data.hours_per_week != null && (
                <Typography variant="body2" color="text.secondary">
                  {data.hours_per_week}h/week committed
                </Typography>
              )}
            </Stack>
          </Box>
        </Stack>

        {/* --- Headline numbers ------------------------------------------------ */}
        <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap", gap: 2 }}>
          <StatTile label="Tasks assigned" value={data.tasks.total} />
          <StatTile label="Completed" value={data.tasks.done} color={SERIES.aqua} />
          <StatTile
            label="Overdue"
            value={data.tasks.overdue}
            color={data.tasks.overdue > 0 ? SERIES.red : undefined}
          />
          <StatTile label="Logged (30d)" value={hours(data.minutes_last_30_days)} />
        </Stack>

        {/* --- Tasks ----------------------------------------------------------- */}
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Tasks
          </Typography>
          {data.tasks.total === 0 ? (
            <Typography color="text.secondary">
              No tasks are assigned to this member on this team.
            </Typography>
          ) : (
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={4}
              sx={{ alignItems: "center" }}
            >
              <CompletionRing percent={data.completion_rate} />
              <Box sx={{ flexGrow: 1, width: "100%" }}>
                <Typography variant="overline" color="text.secondary">
                  By status
                </Typography>
                <CategoryBars
                  bars={[
                    { label: "To do", value: data.tasks.todo, color: SERIES.yellow },
                    {
                      label: "In progress",
                      value: data.tasks.in_progress,
                      color: SERIES.blue,
                    },
                    { label: "Done", value: data.tasks.done, color: SERIES.aqua },
                  ]}
                />
              </Box>
            </Stack>
          )}
        </Paper>

        {/* --- Priority mix ----------------------------------------------------- */}
        {data.tasks.total > 0 && (
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Priority mix
            </Typography>
            <CategoryBars
              bars={[
                { label: "Low", value: data.priorities.low, color: SERIES.aqua },
                { label: "Medium", value: data.priorities.medium, color: SERIES.blue },
                { label: "High", value: data.priorities.high, color: SERIES.yellow },
                { label: "Urgent", value: data.priorities.urgent, color: SERIES.red },
              ]}
            />
          </Paper>
        )}

        {/* --- Hours ------------------------------------------------------------ */}
        {isHourly ? (
          <>
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Hours logged — last 14 days
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Days with nothing logged show as an empty slot.
              </Typography>
              <TimeBars bars={dailyBars} format={(m) => hours(m)} />
            </Paper>

            <Paper variant="outlined" sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Hours per week — last 8 weeks
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                The dashed line is the weekly commitment.
              </Typography>
              <TimeBars
                bars={weeklyBars}
                reference={targetMinutes}
                referenceLabel={
                  targetMinutes ? `Target ${hours(targetMinutes)}` : undefined
                }
                format={(m) => hours(m)}
              />
            </Paper>
          </>
        ) : (
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Hours
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              This member works {MODE_LABELS[data.work_mode].toLowerCase()}, so they
              don&apos;t keep a work log. Set them to hourly to track time here.
            </Typography>
          </Paper>
        )}
      </Stack>
    </AppShell>
  );
}
