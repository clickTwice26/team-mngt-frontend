"use client";

import { useCallback, useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import BoltIcon from "@mui/icons-material/Bolt";
import CloudOffIcon from "@mui/icons-material/CloudOff";

import { ApiError } from "@/lib/api/client";
import { teamsApi } from "@/lib/api/teams";
import { useDiscussionSocket, type SocketStatus } from "@/lib/realtime/use-discussion-socket";
import type { Team } from "@/types/team";
import {
  REACTION_CHOICES,
  type DiscussionEvent,
  type TeamMessage,
} from "@/types/team-message";

import { CommentThreadList } from "./comment-thread";

type State =
  | { kind: "loading" }
  | { kind: "ok"; messages: TeamMessage[] }
  | { kind: "error"; message: string };

/**
 * Fold a pushed event into the thread we're showing.
 *
 * Identity is the message id, and that is what makes this safe to apply blindly:
 * the socket pushes our own posts back to us as well as everyone else's, and the
 * POST that created them has usually already put them on screen.
 */
function applyEvent(messages: TeamMessage[], event: DiscussionEvent): TeamMessage[] {
  if (event.type === "message.created") {
    const incoming = event.message;
    const known = messages.some(
      (m) => m.id === incoming.id || m.replies.some((r) => r.id === incoming.id),
    );
    if (known) return messages;

    if (incoming.parent_id !== null) {
      const parent = messages.find((m) => m.id === incoming.parent_id);
      if (parent) {
        return messages.map((m) =>
          m.id === incoming.parent_id ? { ...m, replies: [...m.replies, incoming] } : m,
        );
      }
      // Replying to a message old enough to be outside the history we loaded.
      // Show it at top level rather than drop it — the same thing the server
      // does with an orphan, and a refetch puts it back under its parent.
    }
    return [...messages, incoming];
  }

  if (event.type === "message.updated") {
    const updated = event.message;
    // The server builds a message on its own, so its `replies` is empty — keep
    // the ones we already have rather than collapsing the thread on a reaction.
    return messages.map((m) => {
      if (m.id === updated.id) return { ...updated, replies: m.replies };
      if (!m.replies.some((r) => r.id === updated.id)) return m;
      return {
        ...m,
        replies: m.replies.map((r) =>
          r.id === updated.id ? { ...updated, replies: r.replies } : r,
        ),
      };
    });
  }

  if (event.type === "message.deleted") {
    // Deleting a top-level message takes its replies with it, server-side. The
    // filter below drops them here for the same reason.
    return messages
      .filter((m) => m.id !== event.id)
      .map((m) =>
        m.replies.some((r) => r.id === event.id)
          ? { ...m, replies: m.replies.filter((r) => r.id !== event.id) }
          : m,
      );
  }

  return messages;
}

/** Say plainly whether what's on screen is live, because a chat that has quietly
 *  stopped updating looks exactly like a quiet one. */
function LiveChip({ status }: { status: SocketStatus }) {
  if (status === "live") {
    return (
      <Chip
        icon={<BoltIcon />}
        label="Live"
        size="small"
        color="success"
        variant="outlined"
      />
    );
  }
  if (status === "connecting") {
    return <Chip label="Connecting…" size="small" variant="outlined" />;
  }
  return (
    <Chip
      icon={<CloudOffIcon />}
      label="Reconnecting…"
      size="small"
      color="warning"
      variant="outlined"
    />
  );
}

export function DiscussionTab({
  team,
  token,
  currentUserId,
}: {
  team: Team;
  token: string;
  currentUserId: string;
}) {
  const [state, setState] = useState<State>({ kind: "loading" });

  const load = useCallback(async () => {
    try {
      const messages = await teamsApi.listDiscussionMessages(token, team.id);
      setState({ kind: "ok", messages });
    } catch (err: unknown) {
      setState({
        kind: "error",
        message:
          err instanceof ApiError ? err.message : "Failed to load the discussion.",
      });
    }
  }, [token, team.id]);

  useEffect(() => {
    queueMicrotask(() => {
      setState({ kind: "loading" });
      void load();
    });
  }, [load]);

  const onEvent = useCallback((event: DiscussionEvent) => {
    setState((previous) =>
      previous.kind === "ok"
        ? { kind: "ok", messages: applyEvent(previous.messages, event) }
        : // Still loading or errored — the fetch in flight will bring the whole
          // thread, this message included, so there is nothing to merge into.
          previous,
    );
  }, []);

  const status = useDiscussionSocket(team.id, token, { onEvent, onResync: load });

  // Apply the server's version of the message straight away, so the reaction
  // lands even if the socket is down. The socket echoes the same update back to
  // us, which is idempotent — it replaces the message with what we already have.
  const react = async (messageId: string, emoji: string, add: boolean) => {
    const updated = add
      ? await teamsApi.addDiscussionReaction(token, team.id, messageId, emoji)
      : await teamsApi.removeDiscussionReaction(token, team.id, messageId, emoji);
    onEvent({ type: "message.updated", message: updated });
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        <Typography color="text.secondary" sx={{ flexGrow: 1 }}>
          Everyone on this team can read and post here.
        </Typography>
        <LiveChip status={status} />
      </Stack>

      {state.kind === "error" && <Alert severity="error">{state.message}</Alert>}

      {state.kind === "loading" && (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <CircularProgress size={20} />
          <Typography color="text.secondary">Loading…</Typography>
        </Stack>
      )}

      {state.kind === "ok" && (
        <CommentThreadList
          comments={state.messages}
          currentUserId={currentUserId}
          actions={{
            post: (payload) => teamsApi.createDiscussionMessage(token, team.id, payload),
            remove: (messageId) =>
              teamsApi.removeDiscussionMessage(token, team.id, messageId),
            upload: (file) => teamsApi.uploadDiscussionAttachment(token, team.id, file),
            reload: load,
            react,
          }}
          emptyText="No messages yet. Start the team's discussion below."
          placeholder="Message the team…"
          // It's a chat, so Enter sends — see CommentThreadList for why the
          // task and work-log threads keep the plain-textarea behaviour.
          submitOnEnter
          reactionChoices={REACTION_CHOICES}
          // A room, not a page: the history scrolls inside the panel and the
          // composer stays put, however many messages pile up.
          variant="chat"
        />
      )}
    </Stack>
  );
}
