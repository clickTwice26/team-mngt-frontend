"use client";

import { useEffect, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import LogoutIcon from "@mui/icons-material/Logout";

import { useAuth } from "@/context/auth-context";

/** Whole seconds between `now` and `iso`, floored at zero. */
function secondsUntil(iso: string, now: number): number {
  return Math.max(0, Math.floor((new Date(iso).getTime() - now) / 1000));
}

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

interface Props {
  /**
   * Reports the rendered height (0 when not impersonating) so the shell can
   * push the fixed header and drawer down by exactly that much. Measured rather
   * than hard-coded because the text wraps to two lines on a narrow screen, and
   * a stale constant would leave the banner covering the header.
   */
  onHeightChange: (height: number) => void;
}

/**
 * The bar that makes an impersonated session impossible to forget you're in.
 *
 * Renders nothing outside one. Inside one it is deliberately loud and pinned
 * above everything: the worst failure mode this feature has is a developer who
 * has stopped noticing that the account they're typing into isn't theirs.
 */
export function ImpersonationBanner({ onHeightChange }: Props) {
  const { impersonation, user, stopImpersonation } = useAuth();
  const [exiting, setExiting] = useState(false);
  // A ticking clock rather than a countdown held in state: the remaining time is
  // derived below, so the only setState here happens in the interval callback.
  const [now, setNow] = useState(() => Date.now());
  const ref = useRef<HTMLDivElement | null>(null);

  const active = Boolean(impersonation && user);

  useEffect(() => {
    if (!active) return;
    const handle = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(handle);
  }, [active]);

  useEffect(() => {
    const node = ref.current;
    if (!active || !node) {
      onHeightChange(0);
      return;
    }
    const observer = new ResizeObserver(([entry]) =>
      onHeightChange(entry.contentRect.height),
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      onHeightChange(0);
    };
  }, [active, onHeightChange]);

  if (!impersonation || !user) return null;

  const remaining = secondsUntil(impersonation.expires_at, now);
  const actor = impersonation.actor_name || impersonation.actor_email;
  const target = user.full_name || user.email;

  const handleExit = async () => {
    setExiting(true);
    try {
      await stopImpersonation();
    } finally {
      // Deliberately not reset on success: the banner unmounts when the session
      // clears, and leaving the button disabled until then stops a double-click
      // firing a second exit against a token that is already dead.
      setExiting(false);
    }
  };

  return (
    <Alert
      ref={ref}
      severity="warning"
      variant="filled"
      icon={false}
      square
      sx={{
        // Fixed above the header and the drawer — both of which the shell has
        // pushed down by this element's height — so the banner cannot be
        // scrolled away or layered under anything.
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: (theme) => theme.zIndex.drawer + 2,
        borderRadius: 0,
        py: 0.5,
        "& .MuiAlert-message": { width: "100%", py: 0.5 },
      }}
      action={
        <Button
          color="inherit"
          size="small"
          variant="outlined"
          startIcon={<LogoutIcon />}
          disabled={exiting}
          onClick={() => void handleExit()}
        >
          {exiting ? "Exiting…" : "Exit"}
        </Button>
      }
    >
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 0.5,
          fontSize: 14,
        }}
      >
        <span>
          You are viewing TeamUp as <strong>{target}</strong>. Signed in as{" "}
          <strong>{actor}</strong>.
        </span>
        <Box component="span" sx={{ opacity: 0.9 }}>
          Session ends in <strong>{formatCountdown(remaining)}</strong>.
        </Box>
      </Box>
    </Alert>
  );
}
