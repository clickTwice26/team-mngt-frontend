"use client";

import { useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";

import { env } from "@/config/env";

/** True when a site key is configured — the login page skips the captcha otherwise. */
export const turnstileConfigured = Boolean(env.turnstileSiteKey);

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

// Load Cloudflare's script once per page, no matter how many widgets mount.
// Shared module-level promise so concurrent callers await the same load.
let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      // Let the next attempt retry from scratch rather than caching the failure.
      scriptPromise = null;
      reject(new Error("Failed to load the captcha."));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

interface Props {
  /** Called with a fresh, single-use token each time the challenge is solved. */
  onVerify: (token: string) => void;
  /** The solved token expired before it was used — treat as "not solved". */
  onExpire?: () => void;
  /** The widget failed to load or run — treat as "not solved". */
  onError?: () => void;
}

/**
 * Cloudflare Turnstile challenge, rendered explicitly so we control its
 * lifecycle. Renders nothing when no site key is configured. The token is
 * single-use: after a failed login the parent remounts this (via `key`) to get
 * a fresh challenge.
 */
export function TurnstileWidget({ onVerify, onExpire, onError }: Props) {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep the latest callbacks in refs so the render effect can stay mount-only
  // — re-rendering the widget on every parent state change would reset it.
  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onVerifyRef.current = onVerify;
    onExpireRef.current = onExpire;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    if (!turnstileConfigured) return;

    let cancelled = false;
    let widgetId: string | undefined;

    void loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        widgetId = window.turnstile.render(containerRef.current, {
          sitekey: env.turnstileSiteKey,
          theme: theme.palette.mode,
          callback: (token) => onVerifyRef.current(token),
          "expired-callback": () => onExpireRef.current?.(),
          "error-callback": () => onErrorRef.current?.(),
        });
      })
      .catch(() => {
        if (!cancelled) onErrorRef.current?.();
      });

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [theme.palette.mode]);

  if (!turnstileConfigured) return null;

  // min-height reserves the widget's space so the form doesn't jump as it loads.
  return (
    <Box
      ref={containerRef}
      sx={{ display: "flex", justifyContent: "center", minHeight: 65 }}
    />
  );
}
