"use client";

import { useEffect, useRef, useState } from "react";

import { wsBaseUrl } from "@/config/env";
import { refreshSession } from "@/lib/api/client";
import type { DiscussionEvent } from "@/types/team-message";

/** The session's access cookie rides the handshake automatically (same-site),
 *  so the token expired mid-session and the socket needs re-auth. */
const WS_UNAUTHORIZED = 4401;

/** Close codes the server uses to say "don't bother retrying". Anything else —
 *  a dropped wifi, a redeploy, an idle proxy — is worth another go. `4401` is
 *  handled specially (refresh, then reconnect), so it isn't listed here. */
const FATAL_CODES = new Set([
  1008, // policy violation: bad Origin, or not authenticated
  1003, // we sent something the socket doesn't accept
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
 * Auth rides in the httpOnly session cookie, which the browser attaches to the
 * WebSocket handshake automatically (same-site) — nothing is read from, or
 * passed by, JavaScript. If the short-lived access cookie has expired the server
 * closes with 4401; the hook then rotates it via `/auth/refresh` and reconnects
 * once, so a long-lived tab heals itself instead of going quiet.
 */
export function useDiscussionSocket(teamId: string, handlers: Handlers): SocketStatus {
  const [status, setStatus] = useState<SocketStatus>("connecting");

  // Held in a ref so a re-render with a new closure doesn't tear the socket
  // down and reconnect — only the team should do that.
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    let disposed = false;
    let socket: WebSocket | null = null;
    let retries = 0;
    let refreshedForAuth = false; // guard: at most one refresh-driven reconnect
    let timer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      if (disposed) return;
      setStatus("connecting");

      const ws = new WebSocket(`${wsBaseUrl}/teams/${teamId}/discussion/ws`);
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
          refreshedForAuth = false; // fresh refresh budget for the next expiry
          return;
        }
        if (event.type === "ping") return; // Heartbeat — nothing to do.

        handlersRef.current.onEvent(event);
      };

      ws.onclose = (event: CloseEvent) => {
        if (disposed) return;
        setStatus("offline");

        // The access cookie expired. Rotate it once, then reconnect — the new
        // cookie rides the next handshake. If refresh fails, or we've already
        // tried, treat it as terminal so we don't loop against a dead session.
        if (event.code === WS_UNAUTHORIZED) {
          if (refreshedForAuth) return;
          refreshedForAuth = true;
          void refreshSession().then((ok) => {
            if (!disposed && ok) connect();
          });
          return;
        }

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
  }, [teamId]);

  return status;
}
