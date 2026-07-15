"use client";

import { useCallback, useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ComputerIcon from "@mui/icons-material/Computer";

import { authApi } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import type { SessionDevice } from "@/types/auth";

/** A best-effort friendly label from a User-Agent string — enough to tell one
 * device from another without pulling in a UA-parsing dependency. */
function deviceLabel(userAgent: string | null): string {
  if (!userAgent) return "Unknown device";
  const browser =
    /Edg\//.test(userAgent) ? "Edge"
    : /OPR\/|Opera/.test(userAgent) ? "Opera"
    : /Chrome\//.test(userAgent) ? "Chrome"
    : /Firefox\//.test(userAgent) ? "Firefox"
    : /Safari\//.test(userAgent) ? "Safari"
    : "Browser";
  const os =
    /Windows/.test(userAgent) ? "Windows"
    : /Macintosh|Mac OS/.test(userAgent) ? "macOS"
    : /Android/.test(userAgent) ? "Android"
    : /iPhone|iPad|iOS/.test(userAgent) ? "iOS"
    : /Linux/.test(userAgent) ? "Linux"
    : "";
  return os ? `${browser} on ${os}` : browser;
}

function relativeTime(iso: string | null): string {
  if (!iso) return "unknown";
  const then = new Date(iso).getTime();
  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}

export function SessionsCard() {
  const [sessions, setSessions] = useState<SessionDevice[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The id currently being revoked, or "all" while signing out everywhere.
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await authApi.listSessions();
      setSessions(list);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load your sessions.");
    }
  }, []);

  // Inlined rather than calling `load()` directly: setState only ever runs after
  // the await, so the effect never triggers a synchronous cascading render.
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const list = await authApi.listSessions();
        if (active) {
          setSessions(list);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof ApiError ? err.message : "Couldn't load your sessions.");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const revoke = async (id: string) => {
    setBusy(id);
    setError(null);
    try {
      await authApi.revokeSession(id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't sign that device out.");
    } finally {
      setBusy(null);
    }
  };

  const signOutOthers = async () => {
    setBusy("all");
    setError(null);
    try {
      await authApi.logoutEverywhere();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't sign out the other devices.");
    } finally {
      setBusy(null);
    }
  };

  const others = sessions?.filter((s) => !s.current) ?? [];

  return (
    <Paper variant="outlined" sx={{ p: 4 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h6">Active sessions</Typography>
          <Typography variant="body2" color="text.secondary">
            Devices where you&apos;re signed in. Sign out any you don&apos;t recognise.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {sessions === null ? (
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">
              Loading sessions…
            </Typography>
          </Stack>
        ) : sessions.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No active sessions found.
          </Typography>
        ) : (
          <Stack divider={<Divider flexItem />} spacing={1.5}>
            {sessions.map((session) => (
              <Stack
                key={session.id}
                direction="row"
                spacing={2}
                sx={{ alignItems: "center", justifyContent: "space-between" }}
              >
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", minWidth: 0 }}>
                  <ComputerIcon color="action" />
                  <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      <Typography variant="body2" noWrap>
                        {deviceLabel(session.user_agent)}
                      </Typography>
                      {session.current && (
                        <Chip label="This device" size="small" color="success" />
                      )}
                    </Stack>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {session.ip_address ?? "Unknown IP"} · active {relativeTime(session.last_seen_at)}
                    </Typography>
                  </Box>
                </Stack>

                {!session.current && (
                  <Button
                    size="small"
                    color="error"
                    disabled={busy !== null}
                    onClick={() => void revoke(session.id)}
                  >
                    {busy === session.id ? "Signing out…" : "Sign out"}
                  </Button>
                )}
              </Stack>
            ))}
          </Stack>
        )}

        {others.length > 0 && (
          <Box>
            <Button
              variant="outlined"
              color="error"
              disabled={busy !== null}
              onClick={() => void signOutOthers()}
            >
              {busy === "all" ? "Signing out…" : "Sign out all other devices"}
            </Button>
          </Box>
        )}
      </Stack>
    </Paper>
  );
}
