"use client";

import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AddReactionIcon from "@mui/icons-material/AddReactionOutlined";
import DeleteIcon from "@mui/icons-material/Delete";
import SendIcon from "@mui/icons-material/Send";

import { AttachmentPicker } from "@/components/attachment-picker";
import { Markdown } from "@/components/markdown";
import { ApiError } from "@/lib/api/client";
import type { MembershipUser } from "@/types/membership";
import type { TaskAttachment } from "@/types/task";

import { AttachmentView } from "./attachment-view";

/** The shape both task comments and work log comments share. Threading is one
 *  level deep, so `replies` is always empty on a reply. */
export interface ThreadComment {
  id: string;
  author: MembershipUser;
  body: string;
  parent_id: string | null;
  attachments: TaskAttachment[];
  replies: ThreadComment[];
  /** Emoji -> ids of everyone who reacted. Absent on threads without reactions. */
  reactions?: Record<string, string[]>;
  created_at: string;
  /** ISO instant after which the author can no longer delete this message. */
  deletable_until: string;
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
  /** Add or take back the current user's reaction. Omitted by threads that
   *  don't have reactions (task, work log, meeting) — the UI hides them then,
   *  rather than offering a button with nothing behind it. */
  react?: (commentId: string, emoji: string, add: boolean) => Promise<unknown>;
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

function formatAge(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/**
 * Milliseconds left in the delete window, ticking down once a second.
 *
 * Recomputed on a timer rather than once on render, so a message posted while
 * you're looking at the thread visibly loses its delete button when the window
 * closes — instead of offering a button that would fail on click.
 */
function useDeleteWindow(deletableUntil: string): { open: boolean; secondsLeft: number } {
  const deadline = new Date(deletableUntil).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (Date.now() > deadline) return; // already closed — nothing to count down
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [deadline]);

  const remaining = deadline - now;
  return { open: remaining > 0, secondsLeft: Math.max(0, Math.ceil(remaining / 1000)) };
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
  submitOnEnter = false,
  reactionChoices,
}: {
  comments: ThreadComment[];
  currentUserId: string;
  actions: ThreadActions;
  emptyText?: string;
  placeholder?: string;
  /** Chat-style: Enter sends, Shift+Enter starts a new line. Off by default —
   *  a task comment is written more like a paragraph than a chat line, and
   *  there Enter should do what it does in any other text box. */
  submitOnEnter?: boolean;
  /** The emoji offered on each message. Omit to hide reactions entirely. */
  reactionChoices?: readonly string[];
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
          submitOnEnter={submitOnEnter}
          reactionChoices={reactionChoices}
        />
      ))}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <CommentComposer
          actions={actions}
          placeholder={placeholder}
          submitOnEnter={submitOnEnter}
        />
      </Paper>
    </>
  );
}

// --- A top-level comment plus its replies -------------------------------------

function CommentThread({
  comment,
  currentUserId,
  actions,
  submitOnEnter,
  reactionChoices,
}: {
  comment: ThreadComment;
  currentUserId: string;
  actions: ThreadActions;
  submitOnEnter: boolean;
  reactionChoices?: readonly string[];
}) {
  const [replying, setReplying] = useState(false);

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <CommentBody
          comment={comment}
          currentUserId={currentUserId}
          actions={actions}
          reactionChoices={reactionChoices}
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
                actions={actions}
                reactionChoices={reactionChoices}
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
              submitOnEnter={submitOnEnter}
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

// --- Reactions ----------------------------------------------------------------

function ReactionBar({
  comment,
  currentUserId,
  choices,
  react,
}: {
  comment: ThreadComment;
  currentUserId: string;
  choices: readonly string[];
  react: NonNullable<ThreadActions["react"]>;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reactions = comment.reactions ?? {};
  // Ordered by `choices`, not by whatever order the server's object happens to
  // have — so a reaction doesn't jump around as counts change.
  const present = choices.filter((emoji) => (reactions[emoji]?.length ?? 0) > 0);

  const toggle = async (emoji: string) => {
    const mine = (reactions[emoji] ?? []).includes(currentUserId);
    setAnchor(null);
    setBusy(emoji);
    setError(null);
    try {
      await react(comment.id, emoji, !mine);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to react.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Stack spacing={0.5} sx={{ pt: 0.5 }}>
      <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.5, alignItems: "center" }}>
        {present.map((emoji) => {
          const who = reactions[emoji] ?? [];
          const mine = who.includes(currentUserId);
          return (
            <Chip
              key={emoji}
              size="small"
              label={`${emoji} ${who.length}`}
              // Filled = you're in this count, so clicking takes it back.
              variant={mine ? "filled" : "outlined"}
              color={mine ? "primary" : "default"}
              disabled={busy === emoji}
              onClick={() => void toggle(emoji)}
            />
          );
        })}

        <Tooltip title="Add a reaction">
          <IconButton
            size="small"
            aria-label="Add a reaction"
            onClick={(e) => setAnchor(e.currentTarget)}
          >
            <AddReactionIcon fontSize="inherit" />
          </IconButton>
        </Tooltip>
      </Stack>

      <Menu anchorEl={anchor} open={anchor !== null} onClose={() => setAnchor(null)}>
        <Stack direction="row" sx={{ px: 1, gap: 0.25 }}>
          {choices.map((emoji) => (
            <IconButton
              key={emoji}
              size="small"
              aria-label={`React with ${emoji}`}
              onClick={() => void toggle(emoji)}
            >
              <Box component="span" sx={{ fontSize: 20, lineHeight: 1 }}>
                {emoji}
              </Box>
            </IconButton>
          ))}
        </Stack>
      </Menu>

      {error && <Alert severity="error">{error}</Alert>}
    </Stack>
  );
}

// --- One message --------------------------------------------------------------

function CommentBody({
  comment,
  currentUserId,
  actions,
  reactionChoices,
}: {
  comment: ThreadComment;
  currentUserId: string;
  actions: ThreadActions;
  reactionChoices?: readonly string[];
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAuthor = comment.author.id === currentUserId;
  const { open: windowOpen, secondsLeft } = useDeleteWindow(comment.deletable_until);

  // Only the author can ever delete, so the button is theirs alone — but it
  // stays visible (disabled) once the window shuts, so the rule is discoverable
  // rather than a button that silently vanishes.
  const canDelete = isAuthor && windowOpen;
  const blockedReason = isAuthor
    ? `Messages can only be deleted within 10 minutes of posting. This one was posted ${formatAge(
        comment.created_at,
      )}.`
    : null;

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await actions.remove(comment.id);
      setConfirming(false);
      await actions.reload();
    } catch (err) {
      // The window may have closed between opening this dialog and confirming;
      // the server is the authority, so surface whatever it says.
      setError(err instanceof ApiError ? err.message : "Failed to delete the message.");
      setDeleting(false);
    }
  };

  const remainingLabel =
    secondsLeft >= 60
      ? `${Math.ceil(secondsLeft / 60)} min left`
      : `${secondsLeft}s left`;

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
            <Tooltip title={canDelete ? `Delete message · ${remainingLabel}` : blockedReason ?? ""}>
              {/* A disabled button fires no events, so the tooltip needs a live
                  wrapper to hang off — otherwise the reason never shows. */}
              <span>
                <IconButton
                  size="small"
                  disabled={!canDelete || deleting}
                  aria-label="Delete message"
                  onClick={() => {
                    setError(null);
                    setConfirming(true);
                  }}
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

        {reactionChoices && actions.react && (
          <ReactionBar
            comment={comment}
            currentUserId={currentUserId}
            choices={reactionChoices}
            react={actions.react}
          />
        )}

        {error && <Alert severity="error">{error}</Alert>}

        <Dialog open={confirming} onClose={() => !deleting && setConfirming(false)}>
          <DialogTitle>Delete this message?</DialogTitle>
          <DialogContent>
            <Stack spacing={2}>
              <DialogContentText>
                {comment.replies.length > 0
                  ? `This also deletes the ${comment.replies.length} ${
                      comment.replies.length === 1 ? "reply" : "replies"
                    } to it. This can't be undone.`
                  : "This can't be undone."}
              </DialogContentText>
              {windowOpen && (
                <Alert severity="info">
                  You can delete a message for {remainingLabel.replace(" left", "")} more —
                  after 10 minutes from posting it becomes permanent.
                </Alert>
              )}
              {!windowOpen && blockedReason && <Alert severity="warning">{blockedReason}</Alert>}
              {error && <Alert severity="error">{error}</Alert>}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirming(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              color="error"
              variant="contained"
              disabled={deleting || !windowOpen}
              onClick={() => void handleDelete()}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogActions>
        </Dialog>
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
  submitOnEnter = false,
  onCancel,
  onPosted,
}: {
  actions: ThreadActions;
  parentId?: string;
  placeholder: string;
  autoFocus?: boolean;
  submitOnEnter?: boolean;
  onCancel?: () => void;
  onPosted?: () => void;
}) {
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mirrors the server rule: a message needs text, an attachment, or both.
  const canSubmit = (body.trim().length > 0 || attachments.length > 0) && !uploading;

  const submit = async () => {
    if (!canSubmit || submitting) return;
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

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!submitOnEnter || event.key !== "Enter") return;
    // Shift+Enter is how you get a new line once Enter means "send".
    if (event.shiftKey) return;
    // An IME (Bangla, Japanese, Chinese…) uses Enter to accept the candidate
    // word it is composing. Sending on that would post a half-typed word and
    // swallow the keystroke the writer meant for the IME.
    if (event.nativeEvent.isComposing) return;

    event.preventDefault();
    void submit();
  };

  return (
    <Stack
      component="form"
      spacing={1.5}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
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
        onKeyDown={handleKeyDown}
        helperText={submitOnEnter ? "Enter to send · Shift+Enter for a new line" : undefined}
      />

      <AttachmentPicker
        value={attachments}
        onChange={setAttachments}
        upload={actions.upload}
        allow={["image", "video", "markdown", "file"]}
        limits={{ video: 1 }}
        label="Attachments"
        onUploadingChange={setUploading}
      />

      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
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
