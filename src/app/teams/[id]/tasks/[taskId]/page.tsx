"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import NextLink from "next/link";
import { useParams, useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import ImageIcon from "@mui/icons-material/Image";
import SendIcon from "@mui/icons-material/Send";

import { AppShell } from "@/components/layout/app-shell";
import { Markdown } from "@/components/markdown";
import { useAuth } from "@/context/auth-context";
import { ApiError } from "@/lib/api/client";
import { teamsApi } from "@/lib/api/teams";
import type { Task, TaskAttachment } from "@/types/task";
import type { TaskComment } from "@/types/task-comment";

import { AttachmentView } from "../../_components/attachment-view";

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

type State =
  | { kind: "loading" }
  | { kind: "ok"; task: Task; comments: TaskComment[] }
  | { kind: "error"; message: string };

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

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
      <Stack spacing={3} sx={{ maxWidth: 720 }}>
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

        <Stack spacing={1}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
            {task.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Discussion between the submitter and the assignees.
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1, pt: 0.5 }}>
            <Chip
              size="small"
              variant="outlined"
              label={`Submitted by ${task.created_by.full_name || task.created_by.email}`}
            />
            {task.assignees.map((a) => (
              <Chip key={a.id} size="small" label={a.full_name || a.email} />
            ))}
          </Stack>
        </Stack>

        {comments.length === 0 && (
          <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">
              No messages yet. Start the discussion below.
            </Typography>
          </Paper>
        )}

        <Stack spacing={2}>
          {comments.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              currentUserId={user.id}
              teamId={teamId}
              taskId={taskId}
              token={token!}
              onChanged={load}
            />
          ))}
        </Stack>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <CommentComposer
            teamId={teamId}
            taskId={taskId}
            token={token!}
            placeholder="Write a message…"
            onPosted={load}
          />
        </Paper>
      </Stack>
    </AppShell>
  );
}

// --- A top-level comment plus its replies -------------------------------------

function CommentThread({
  comment,
  currentUserId,
  teamId,
  taskId,
  token,
  onChanged,
}: {
  comment: TaskComment;
  currentUserId: string;
  teamId: string;
  taskId: string;
  token: string;
  onChanged: () => void | Promise<void>;
}) {
  const [replying, setReplying] = useState(false);

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <CommentBody
          comment={comment}
          currentUserId={currentUserId}
          teamId={teamId}
          taskId={taskId}
          token={token}
          onChanged={onChanged}
        />

        {comment.replies.length > 0 && (
          <Stack
            spacing={1.5}
            sx={{ pl: 2, ml: 1, borderLeft: "2px solid", borderColor: "divider" }}
          >
            {comment.replies.map((reply) => (
              <CommentBody
                key={reply.id}
                comment={reply}
                currentUserId={currentUserId}
                teamId={teamId}
                taskId={taskId}
                token={token}
                onChanged={onChanged}
              />
            ))}
          </Stack>
        )}

        {replying ? (
          <Box sx={{ pl: 2, ml: 1 }}>
            <CommentComposer
              teamId={teamId}
              taskId={taskId}
              token={token}
              parentId={comment.id}
              placeholder="Write a reply…"
              autoFocus
              onCancel={() => setReplying(false)}
              onPosted={async () => {
                setReplying(false);
                await onChanged();
              }}
            />
          </Box>
        ) : (
          <Box>
            <Button size="small" onClick={() => setReplying(true)}>
              Reply
            </Button>
          </Box>
        )}
      </Stack>
    </Paper>
  );
}

// --- One message --------------------------------------------------------------

function CommentBody({
  comment,
  currentUserId,
  teamId,
  taskId,
  token,
  onChanged,
}: {
  comment: TaskComment;
  currentUserId: string;
  teamId: string;
  taskId: string;
  token: string;
  onChanged: () => void | Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAuthor = comment.author.id === currentUserId;

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await teamsApi.removeTaskComment(token, teamId, taskId, comment.id);
      await onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete the message.");
      setDeleting(false);
    }
  };

  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
      <Avatar src={comment.author.avatar_url ?? undefined} sx={{ width: 32, height: 32 }}>
        {initials(comment.author.full_name, comment.author.email)}
      </Avatar>
      <Stack spacing={0.5} sx={{ flexGrow: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {comment.author.full_name || comment.author.email}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatTimestamp(comment.created_at)}
          </Typography>
          {isAuthor && (
            <Tooltip title="Delete message">
              <span>
                <IconButton
                  size="small"
                  disabled={deleting}
                  aria-label="Delete message"
                  onClick={() => void handleDelete()}
                >
                  <DeleteIcon fontSize="inherit" />
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Stack>

        {comment.body && <Markdown>{comment.body}</Markdown>}

        {comment.attachments.length > 0 && (
          <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap", gap: 1.5, pt: 0.5 }}>
            {comment.attachments.map((a) => (
              <AttachmentView key={a.url} attachment={a} />
            ))}
          </Stack>
        )}

        {error && <Alert severity="error">{error}</Alert>}
      </Stack>
    </Stack>
  );
}

// --- Composer (shared by the thread and each reply) ----------------------------

function CommentComposer({
  teamId,
  taskId,
  token,
  parentId,
  placeholder,
  autoFocus,
  onPosted,
  onCancel,
}: {
  teamId: string;
  taskId: string;
  token: string;
  parentId?: string;
  placeholder: string;
  autoFocus?: boolean;
  onPosted: () => void | Promise<void>;
  onCancel?: () => void;
}) {
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Mirrors the server rule: a message needs text, an image, or both.
  const canSubmit = (body.trim().length > 0 || attachments.length > 0) && !uploading;

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = ""; // allow re-picking the same file
    if (files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      for (const file of files) {
        const uploaded = await teamsApi.uploadTaskAttachment(token, teamId, file);
        setAttachments((prev) => [...prev, uploaded]);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to upload the image.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await teamsApi.createTaskComment(token, teamId, taskId, {
        body: body.trim(),
        parent_id: parentId ?? null,
        attachments,
      });
      setBody("");
      setAttachments([]);
      await onPosted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to post the message.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Stack component="form" spacing={1.5} onSubmit={(e) => void handleSubmit(e)}>
      {error && <Alert severity="error">{error}</Alert>}

      <TextField
        multiline
        minRows={2}
        fullWidth
        size="small"
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />

      {attachments.length > 0 && (
        <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap", gap: 1.5 }}>
          {attachments.map((a) => (
            <Box key={a.url} sx={{ position: "relative" }}>
              <AttachmentView attachment={a} />
              <IconButton
                size="small"
                aria-label={`Remove ${a.filename}`}
                onClick={() => setAttachments((prev) => prev.filter((x) => x.url !== a.url))}
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

      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <input
          ref={fileInput}
          type="file"
          hidden
          multiple
          accept={IMAGE_ACCEPT}
          onChange={(e) => void handleUpload(e)}
        />
        <Button
          size="small"
          startIcon={uploading ? <CircularProgress size={14} /> : <ImageIcon />}
          disabled={uploading}
          onClick={() => fileInput.current?.click()}
        >
          {uploading ? "Uploading…" : "Image"}
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        {onCancel && (
          <Button size="small" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          size="small"
          variant="contained"
          endIcon={<SendIcon />}
          disabled={!canSubmit || submitting}
        >
          {submitting ? "Sending…" : "Send"}
        </Button>
      </Stack>
    </Stack>
  );
}
