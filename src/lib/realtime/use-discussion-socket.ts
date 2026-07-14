"use client";

import { useEffect, useRef, useState } from "react";

import { wsBaseUrl } from "@/config/env";
import type { DiscussionEvent } from "@/types/team-message";

/** Must match BEARER_SUBPROTOCOL in api/v1/endpoints/discussion.py. */
const BEARER_SUBPROTOCOL = "teamup.bearer.v1";

/** Close codes the server uses to say "don't bother retrying". Anything else —
 *  a dropped wifi, a redeploy, an idle proxy — is worth another go. */
const FATAL_CODES = new Set([
  1008, // policy violation: bad Origin, or no token offered
  1003, // we sent something the socket doesn't accept
  4401, // token invalid or expired
  4403, // not a member of this team
]);

const MAX_BACKOFF_MS = 30_000;

export type SocketStatus = "connecting" | "live" | "offline";

interface Handlers {
  /** A message was posted or deleted somewhere in the team. */
  onEvent: (event: DiscussionEvent) => void;
  /** The socket came back after dropping. Anything posted while it was down was
   *  never pushed to us, so the caller refetches instead of quietly showing a
   *  thread with a hole in it. */
  onResync: () => void;
}

/**
 * Subscribes to a team's discussion.
 *
 * The token rides in the WebSocket subprotocol rather than the query string: a
 * browser can't set an Authorization header here, and a URL ends up written down
 * in far more places (access logs, proxy traces) than a header does.
 */
export function useDiscussionSocket(
  teamId: string,
  token: string,
  handlers: Handlers,
): SocketStatus {
  const [status, setStatus] = useState<SocketStatus>("connecting");

  // Held in a ref so a re-render with a new closure doesn't tear the socket
  // down and reconnect — only the team or the token should do that.
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    let disposed = false;
    let socket: WebSocket | null = null;
    let retries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      if (disposed) return;
      setStatus("connecting");

      const ws = new WebSocket(`${wsBaseUrl}/teams/${teamId}/discussion/ws`, [
        BEARER_SUBPROTOCOL,
        token,
      ]);
      socket = ws;

      ws.onmessage = (raw: MessageEvent<string>) => {
        let event: DiscussionEvent;
        try {
          event = JSON.parse(raw.data) as DiscussionEvent;
        } catch {
          return; // Not ours to interpret. Dropping it is safer than guessing.
        }

        if (event.type === "ready") {
          setStatus("live");
          // A first connect has the history the tab just fetched. A *re*connect
          // may have missed messages while it was down.
          if (retries > 0) handlersRef.current.onResync();
          retries = 0;
          return;
        }
        if (event.type === "ping") return; // Heartbeat — nothing to do.

        handlersRef.current.onEvent(event);
      };

      ws.onclose = (event: CloseEvent) => {
        if (disposed) return;
        setStatus("offline");
        if (FATAL_CODES.has(event.code)) return;

        // Back off so a backend that's down doesn't get hammered by every open
        // tab at once.
        const delay = Math.min(1000 * 2 ** retries, MAX_BACKOFF_MS);
        retries += 1;
        timer = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      disposed = true;
      clearTimeout(timer);
      // 1000 = a normal closure: we're leaving the tab, not failing.
      socket?.close(1000, "Leaving the discussion");
    };
  }, [teamId, token]);

  return status;
}
