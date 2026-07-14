"use client";

import { useCallback, useEffect, useState } from "react";
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
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";

import { AppShell } from "@/components/layout/app-shell";
import { Markdown } from "@/components/markdown";
import { useAuth } from "@/context/auth-context";
import { ApiError } from "@/lib/api/client";
import { teamsApi } from "@/lib/api/teams";
import type { Task } from "@/types/task";
import type { TaskComment } from "@/types/task-comment";

import { AttachmentView } from "../../_components/attachment-view";
import { CommentThreadList } from "../../_components/comment-thread";
import {
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  formatDeadline,
  isOverdue,
} from "../../_components/task-meta";

type State =
  | { kind: "loading" }
  | { kind: "ok"; task: Task; comments: TaskComment[] }
  | { kind: "error"; message: string };

function initials(name: string | null, email: string): string {
  const source = name?.trim() || email;
  return source.slice(0, 1).toUpperCase();
}

export default function TaskDiscussionPage() {
  const { id: teamId, taskId } = useParams<{ id: string; taskId: string }>();
  const router = useRouter();
  const { user, token, loading: authLoading, isAuthenticated } = useAuth();

  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace("/login");
  }, [authLoading, isAuthenticated, router]);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      // There's no fetch-one-task endpoint, so pull the team's tasks and pick
      // ours out. The comments call is what enforces access, not this.
      const [tasks, comments] = await Promise.all([
        teamsApi.listTasks(token, teamId),
        teamsApi.listTaskComments(token, teamId, taskId),
      ]);
      const task = tasks.find((t) => t.id === taskId);
      if (!task) {
        setState({ kind: "error", message: "Task not found." });
        return;
      }
      setState({ kind: "ok", task, comments });
    } catch (err) {
      setState({
        kind: "error",
        message:
          err instanceof ApiError
            ? err.message
            : "Failed to load the discussion.",
      });
    }
  }, [token, teamId, taskId]);

  useEffect(() => {
    // Deferred like the tasks tab does: calling `load` (which setStates)
    // synchronously in an effect body trips React's cascading-render rule.
    queueMicrotask(() => void load());
  }, [load]);

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
            <Button
              component={NextLink}
              href={`/teams/${teamId}?tab=tasks`}
              startIcon={<ArrowBackIcon />}
            >
              Back to tasks
            </Button>
          </Box>
        </Stack>
      </AppShell>
    );
  }

  const { task, comments } = state;

  return (
    <AppShell>
      <Stack spacing={3} sx={{ maxWidth: 1200 }}>
        <Box>
          <Button
            component={NextLink}
            href={`/teams/${teamId}?tab=tasks`}
            startIcon={<ArrowBackIcon />}
            size="small"
          >
            Back to tasks
          </Button>
        </Box>

        <Stack direction={{ xs: "column", md: "row" }} spacing={3} sx={{ alignItems: "flex-start" }}>
          {/* --- Left: the task itself ---------------------------------------- */}
          <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
            <TaskDetails task={task} />
          </Box>

          {/* --- Right: the discussion ---------------------------------------- */}
          <Stack spacing={2} sx={{ flex: 1, minWidth: 0, width: "100%" }}>
            <Box>
              <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                Discussion
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Between the submitter, the assignees, and a founder.
              </Typography>
            </Box>

            <CommentThreadList
              comments={comments}
              currentUserId={user.id}
              actions={{
                post: (payload) =>
                  teamsApi.createTaskComment(token!, teamId, taskId, payload),
                remove: (commentId) =>
                  teamsApi.removeTaskComment(token!, teamId, taskId, commentId),
                upload: (file) => teamsApi.uploadTaskAttachment(token!, teamId, file),
                reload: load,
              }}
            />
          </Stack>
        </Stack>
      </Stack>
    </AppShell>
  );
}

// --- The task, in full --------------------------------------------------------

/** Read-only view of everything on the task. Editing still lives on the tasks
 *  tab; this panel is context for the discussion beside it. */
function TaskDetails({ task }: { task: Task }) {
  const overdue = isOverdue(task);

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Stack spacing={1}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
            {task.title}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
            <Chip
              size="small"
              label={PRIORITY_LABELS[task.priority]}
              color={PRIORITY_COLORS[task.priority]}
              variant={task.priority === "low" ? "outlined" : "filled"}
            />
            <Chip
              size="small"
              label={STATUS_LABELS[task.status]}
              color={STATUS_COLORS[task.status]}
            />
          </Stack>
        </Stack>

        {task.deadline && (
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
            <CalendarTodayIcon fontSize="inherit" color={overdue ? "error" : "action"} />
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

        {task.description && (
          <Box>
            <Typography variant="overline" color="text.secondary">
              Description
            </Typography>
            <Markdown>{task.description}</Markdown>
          </Box>
        )}

        {task.attachments.length > 0 && (
          <Box>
            <Typography variant="overline" color="text.secondary">
              Attachments
            </Typography>
            <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap", gap: 1.5, mt: 0.5 }}>
              {task.attachments.map((a) => (
                <AttachmentView key={a.url} attachment={a} />
              ))}
            </Stack>
          </Box>
        )}

        <Box>
          <Typography variant="overline" color="text.secondary">
            Submitted by
          </Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", mt: 0.5 }}>
            <Avatar
              src={task.created_by.avatar_url ?? undefined}
              sx={{ width: 28, height: 28 }}
            >
              {initials(task.created_by.full_name, task.created_by.email)}
            </Avatar>
            <Typography variant="body2">
              {task.created_by.full_name || task.created_by.email}
            </Typography>
          </Stack>
        </Box>

        <Box>
          <Typography variant="overline" color="text.secondary">
            Assigned to
          </Typography>
          {task.assignees.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Nobody yet.
            </Typography>
          ) : (
            <Stack spacing={1} sx={{ mt: 0.5 }}>
              {task.assignees.map((a) => (
                <Stack key={a.id} direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <Avatar src={a.avatar_url ?? undefined} sx={{ width: 28, height: 28 }}>
                    {initials(a.full_name, a.email)}
                  </Avatar>
                  <Typography variant="body2">{a.full_name || a.email}</Typography>
                </Stack>
              ))}
            </Stack>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}
