"use client";

import { useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import ImageIcon from "@mui/icons-material/Image";
import SendIcon from "@mui/icons-material/Send";
import VideocamIcon from "@mui/icons-material/Videocam";

import { Markdown } from "@/components/markdown";
import { ApiError } from "@/lib/api/client";
import type { MembershipUser } from "@/types/membership";
import type { TaskAttachment } from "@/types/task";

import { AttachmentView } from "./attachment-view";

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const VIDEO_ACCEPT = "video/mp4,video/webm,video/quicktime,video/ogg";

/** The shape both task comments and work log comments share. Threading is one
 *  level deep, so `replies` is always empty on a reply. */
export interface ThreadComment {
  id: string;
  author: MembershipUser;
  body: string;
  parent_id: string | null;
  attachments: TaskAttachment[];
  replies: ThreadComment[];
  created_at: string;
}

export interface NewComment {
  body: string;
  parent_id: string | null;
  attachments: TaskAttachment[];
}

/** What the thread needs from whichever resource it hangs off. */
export interface ThreadActions {
  post: (payload: NewComment) => Promise<unknown>;
  remove: (commentId: string) => Promise<unknown>;
  upload: (file: File) => Promise<TaskAttachment>;
  /** Refetch after a post or delete. */
  reload: () => void | Promise<void>;
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function initials(name: string | null, email: string): string {
  return (name?.trim() || email).slice(0, 1).toUpperCase();
}

/**
 * A whole discussion: the existing comments plus a composer.
 *
 * Shared by the task discussion and the work log discussion — they differ only
 * in which endpoints `actions` calls, not in how a thread behaves.
 */
export function CommentThreadList({
  comments,
  currentUserId,
  actions,
  emptyText = "No messages yet. Start the discussion below.",
  placeholder = "Write a message…",
}: {
  comments: ThreadComment[];
  currentUserId: string;
  actions: ThreadActions;
  emptyText?: string;
  placeholder?: string;
}) {
  return (
    <>
      {comments.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary">{emptyText}</Typography>
        </Paper>
      )}

      {comments.map((comment) => (
        <CommentThread
          key={comment.id}
          comment={comment}
          currentUserId={currentUserId}
          actions={actions}
        />
      ))}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <CommentComposer actions={actions} placeholder={placeholder} />
      </Paper>
    </>
  );
}

// --- A top-level comment plus its replies -------------------------------------

function CommentThread({
  comment,
  currentUserId,
  actions,
}: {
  comment: ThreadComment;
  currentUserId: string;
  actions: ThreadActions;
}) {
  const [replying, setReplying] = useState(false);

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <CommentBody comment={comment} currentUserId={currentUserId} actions={actions} />

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
                actions={actions}
              />
            ))}
          </Stack>
        )}

        {replying ? (
          <Box sx={{ pl: 2, ml: 1 }}>
            <CommentComposer
              actions={actions}
              parentId={comment.id}
              placeholder="Write a reply…"
              autoFocus
              onCancel={() => setReplying(false)}
              onPosted={() => setReplying(false)}
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
  actions,
}: {
  comment: ThreadComment;
  currentUserId: string;
  actions: ThreadActions;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAuthor = comment.author.id === currentUserId;

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await actions.remove(comment.id);
      await actions.reload();
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
  actions,
  parentId,
  placeholder,
  autoFocus,
  onCancel,
  onPosted,
}: {
  actions: ThreadActions;
  parentId?: string;
  placeholder: string;
  autoFocus?: boolean;
  onCancel?: () => void;
  onPosted?: () => void;
}) {
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);

  const hasVideo = attachments.some((a) => a.kind === "video");

  // Mirrors the server rule: a message needs text, an attachment, or both.
  const canSubmit = (body.trim().length > 0 || attachments.length > 0) && !uploading;

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = ""; // allow re-picking the same file
    if (files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      for (const file of files) {
        const uploaded = await actions.upload(file);
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
      const uploaded = await actions.upload(file);
      // The server allows one video per message, so a new pick replaces the last.
      setAttachments((prev) => [...prev.filter((a) => a.kind !== "video"), uploaded]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to upload the video.");
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
      await actions.post({
        body: body.trim(),
        parent_id: parentId ?? null,
        attachments,
      });
      setBody("");
      setAttachments([]);
      onPosted?.();
      await actions.reload();
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
          ref={imageInput}
          type="file"
          hidden
          multiple
          accept={IMAGE_ACCEPT}
          onChange={(e) => void handleImageUpload(e)}
        />
        <input
          ref={videoInput}
          type="file"
          hidden
          accept={VIDEO_ACCEPT}
          onChange={(e) => void handleVideoUpload(e)}
        />
        <Button
          size="small"
          startIcon={uploading ? <CircularProgress size={14} /> : <ImageIcon />}
          disabled={uploading}
          onClick={() => imageInput.current?.click()}
        >
          {uploading ? "Uploading…" : "Image"}
        </Button>
        <Tooltip title={hasVideo ? "Replaces the current video" : ""}>
          <span>
            <Button
              size="small"
              startIcon={<VideocamIcon />}
              disabled={uploading}
              onClick={() => videoInput.current?.click()}
            >
              {hasVideo ? "Replace video" : "Video"}
            </Button>
          </span>
        </Tooltip>
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
