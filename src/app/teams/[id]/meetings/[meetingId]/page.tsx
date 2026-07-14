"use client";

import { useCallback, useEffect, useState } from "react";
import NextLink from "next/link";
import { useParams, useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ScheduleIcon from "@mui/icons-material/Schedule";
import dayjs from "dayjs";

import { AppShell } from "@/components/layout/app-shell";
import { Markdown } from "@/components/markdown";
import { useAuth } from "@/context/auth-context";
import { ApiError } from "@/lib/api/client";
import { teamsApi } from "@/lib/api/teams";
import type { Meeting } from "@/types/meeting";
import type { MeetingComment } from "@/types/meeting-comment";

import { AttachmentView } from "../../_components/attachment-view";
import { CommentThreadList } from "../../_components/comment-thread";
import { useNow } from "../../_components/meeting-status";
import { MeetingJoinButton } from "../../_components/meetings-tab";

type State =
  | { kind: "loading" }
  | { kind: "ok"; meeting: Meeting; comments: MeetingComment[] }
  | { kind: "error"; message: string };

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export default function MeetingPage() {
  const { id: teamId, meetingId } = useParams<{ id: string; meetingId: string }>();
  const router = useRouter();
  const { user, token, loading: authLoading, isAuthenticated } = useAuth();

  const now = useNow();
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace("/login");
  }, [authLoading, isAuthenticated, router]);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [meeting, comments] = await Promise.all([
        teamsApi.getMeeting(token, teamId, meetingId),
        teamsApi.listMeetingComments(token, teamId, meetingId),
      ]);
      setState({ kind: "ok", meeting, comments });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof ApiError ? err.message : "Failed to load the meeting.",
      });
    }
  }, [token, teamId, meetingId]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const backHref = `/teams/${teamId}?tab=meetings`;

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
              Back to meetings
            </Button>
          </Box>
        </Stack>
      </AppShell>
    );
  }

  const { meeting, comments } = state;
  const start = dayjs(meeting.scheduled_at);

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
            Back to meetings
          </Button>
        </Box>

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={3}
          sx={{ alignItems: "flex-start" }}
        >
          {/* --- Left: the meeting ------------------------------------------- */}
          <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
                    {meeting.title}
                  </Typography>
                  <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{ alignItems: "center", color: "text.secondary", mt: 0.5 }}
                  >
                    <ScheduleIcon fontSize="inherit" />
                    <Typography variant="body2">
                      {start.format("dddd, MMM D, YYYY · h:mm A")} ·{" "}
                      {formatDuration(meeting.duration_minutes)}
                    </Typography>
                  </Stack>
                </Box>

                <Box>
                  <MeetingJoinButton meeting={meeting} now={now} size="medium" />
                </Box>

                {meeting.topics.length > 0 && (
                  <Box>
                    <Typography variant="overline" color="text.secondary">
                      Topics
                    </Typography>
                    <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5 }}>
                      {meeting.topics.map((topic) => (
                        <Typography component="li" variant="body2" key={topic} sx={{ my: 0.5 }}>
                          {topic}
                        </Typography>
                      ))}
                    </Box>
                  </Box>
                )}

                {meeting.notes && (
                  <Box>
                    <Typography variant="overline" color="text.secondary">
                      Notes
                    </Typography>
                    <Markdown>{meeting.notes}</Markdown>
                  </Box>
                )}

                {meeting.attachments.length > 0 && (
                  <Box>
                    <Typography variant="overline" color="text.secondary">
                      Files
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={1.5}
                      sx={{ flexWrap: "wrap", gap: 1.5, mt: 0.5 }}
                    >
                      {meeting.attachments.map((a) => (
                        <AttachmentView key={a.url} attachment={a} />
                      ))}
                    </Stack>
                  </Box>
                )}

                <Box>
                  <Typography variant="overline" color="text.secondary">
                    Attendees
                  </Typography>
                  {meeting.attendees.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      The whole team is invited.
                    </Typography>
                  ) : (
                    <Stack spacing={1} sx={{ mt: 0.5 }}>
                      {meeting.attendees.map((a) => (
                        <Stack
                          key={a.id}
                          direction="row"
                          spacing={1}
                          sx={{ alignItems: "center" }}
                        >
                          <Avatar src={a.avatar_url ?? undefined} sx={{ width: 28, height: 28 }}>
                            {(a.full_name || a.email).charAt(0).toUpperCase()}
                          </Avatar>
                          <Typography variant="body2">{a.full_name || a.email}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                  )}
                </Box>

                <Box>
                  <Typography variant="overline" color="text.secondary">
                    Scheduled by
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", mt: 0.5 }}>
                    <Avatar
                      src={meeting.created_by.avatar_url ?? undefined}
                      sx={{ width: 28, height: 28 }}
                    >
                      {(meeting.created_by.full_name || meeting.created_by.email)
                        .charAt(0)
                        .toUpperCase()}
                    </Avatar>
                    <Typography variant="body2">
                      {meeting.created_by.full_name || meeting.created_by.email}
                    </Typography>
                  </Stack>
                </Box>
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
                Open to everyone on the team.
              </Typography>
            </Box>

            <CommentThreadList
              comments={comments}
              currentUserId={user.id}
              actions={{
                post: (payload) =>
                  teamsApi.createMeetingComment(token!, teamId, meetingId, payload),
                remove: (commentId) =>
                  teamsApi.removeMeetingComment(token!, teamId, meetingId, commentId),
                upload: (file) => teamsApi.uploadMeetingAttachment(token!, teamId, file),
                reload: load,
              }}
              emptyText="No messages yet. Raise a topic or follow up below."
            />
          </Stack>
        </Stack>
      </Stack>
    </AppShell>
  );
}
