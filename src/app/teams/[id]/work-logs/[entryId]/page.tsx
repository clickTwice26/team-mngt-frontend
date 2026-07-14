"use client";

import { useCallback, useEffect, useState } from "react";
import NextLink from "next/link";
import { useParams, useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import dayjs from "dayjs";

import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/context/auth-context";
import { ApiError } from "@/lib/api/client";
import { teamsApi } from "@/lib/api/teams";
import type { WorkLogEntry } from "@/types/work-log";
import type { WorkLogComment } from "@/types/work-log-comment";

import { AttachmentView } from "../../_components/attachment-view";
import { CommentThreadList } from "../../_components/comment-thread";

type State =
  | { kind: "loading" }
  | { kind: "ok"; entry: WorkLogEntry; comments: WorkLogComment[] }
  | { kind: "error"; message: string };

function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function WorkLogDiscussionPage() {
  const { id: teamId, entryId } = useParams<{ id: string; entryId: string }>();
  const router = useRouter();
  const { user, token, loading: authLoading, isAuthenticated } = useAuth();

  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace("/login");
  }, [authLoading, isAuthenticated, router]);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      // There's no fetch-one-entry endpoint, so pull the member's log and pick
      // ours out. The comments call is what enforces access, not this.
      const [entries, comments] = await Promise.all([
        teamsApi.listWorkLogs(token, teamId),
        teamsApi.listWorkLogComments(token, teamId, entryId),
      ]);
      const entry = entries.find((e) => e.id === entryId);
      if (!entry) {
        setState({ kind: "error", message: "Work log entry not found." });
        return;
      }
      setState({ kind: "ok", entry, comments });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof ApiError ? err.message : "Failed to load the discussion.",
      });
    }
  }, [token, teamId, entryId]);

  useEffect(() => {
    // Deferred: setState synchronously in an effect body trips React's
    // cascading-render rule.
    queueMicrotask(() => void load());
  }, [load]);

  const backHref = `/teams/${teamId}?tab=hours`;

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
              Back to my hours
            </Button>
          </Box>
        </Stack>
      </AppShell>
    );
  }

  const { entry, comments } = state;

  return (
    <AppShell>
      <Stack spacing={3} sx={{ maxWidth: 1200 }}>
        <Box>
          <Button
            component={NextLink}
            href={backHref}
            startIcon={<ArrowBackIcon />}
            size="small"
          >
            Back to my hours
          </Button>
        </Box>

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={3}
          sx={{ alignItems: "flex-start" }}
        >
          {/* --- Left: the logged block of work ------------------------------- */}
          <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
                    {dayjs(entry.started_at).format("dddd, MMM D, YYYY")}
                  </Typography>
                  <Typography color="text.secondary">
                    {dayjs(entry.started_at).format("h:mm A")} –{" "}
                    {dayjs(entry.ended_at).format("h:mm A")} ·{" "}
                    {formatMinutes(entry.minutes)}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="overline" color="text.secondary">
                    What was worked on
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                    {entry.description}
                  </Typography>
                </Box>

                {entry.task_title && (
                  <Box>
                    <Typography variant="overline" color="text.secondary">
                      Linked task
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Chip
                        size="small"
                        variant="outlined"
                        icon={<TaskAltIcon />}
                        label={entry.task_title}
                      />
                    </Box>
                  </Box>
                )}

                {entry.attachments.length > 0 && (
                  <Box>
                    <Typography variant="overline" color="text.secondary">
                      Attachments
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={1.5}
                      sx={{ flexWrap: "wrap", gap: 1.5, mt: 0.5 }}
                    >
                      {entry.attachments.map((a) => (
                        <AttachmentView key={a.url} attachment={a} />
                      ))}
                    </Stack>
                  </Box>
                )}
              </Stack>
            </Paper>
          </Box>

          {/* --- Right: the discussion ---------------------------------------- */}
          <Stack spacing={2} sx={{ flex: 1, minWidth: 0, width: "100%" }}>
            <Box>
              <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                Discussion
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Between the member who logged these hours and a super admin.
              </Typography>
            </Box>

            <CommentThreadList
              comments={comments}
              currentUserId={user.id}
              actions={{
                post: (payload) =>
                  teamsApi.createWorkLogComment(token!, teamId, entryId, payload),
                remove: (commentId) =>
                  teamsApi.removeWorkLogComment(token!, teamId, entryId, commentId),
                upload: (file) => teamsApi.uploadWorkLogAttachment(token!, teamId, file),
                reload: load,
              }}
              emptyText="No messages yet. Start the discussion below."
            />
          </Stack>
        </Stack>
      </Stack>
    </AppShell>
  );
}
