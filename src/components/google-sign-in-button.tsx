"use client";

import { useState } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Tooltip from "@mui/material/Tooltip";
import SvgIcon from "@mui/material/SvgIcon";

import { auth, firebaseConfigured } from "@/lib/firebase/client";

/** Official multi-colour Google "G" mark, per Google's branding guidelines. */
function GoogleIcon() {
  return (
    <SvgIcon viewBox="0 0 48 48" sx={{ fontSize: 18 }}>
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </SvgIcon>
  );
}

function friendlyMessage(err: unknown): string {
  const code = (err as { code?: string } | null | undefined)?.code;
  switch (code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Sign-in was cancelled.";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in popup. Please allow popups and try again.";
    case "auth/network-request-failed":
      return "Network error — check your connection and try again.";
    default:
      return err instanceof Error ? err.message : "Google sign-in failed.";
  }
}

interface Props {
  onCredential: (idToken: string) => void | Promise<void>;
  onError?: (message: string) => void;
}

/**
 * "Continue with Google" via Firebase Authentication's Google provider.
 * Falls back to a disabled button when Firebase isn't configured.
 */
export function GoogleSignInButton({ onCredential, onError }: Props) {
  const [loading, setLoading] = useState(false);

  // Captured as a local const so TypeScript can narrow past the module's
  // mutable `auth` export (which it won't narrow across a closure boundary).
  const authInstance = auth;

  if (!firebaseConfigured || !authInstance) {
    return (
      <Tooltip title="Set NEXT_PUBLIC_FIREBASE_* env vars to enable Google sign-in">
        <span>
          <Button fullWidth variant="outlined" size="large" startIcon={<GoogleIcon />} disabled>
            Continue with Google
          </Button>
        </span>
      </Tooltip>
    );
  }

  const handleClick = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(authInstance, new GoogleAuthProvider());
      const idToken = await result.user.getIdToken();
      await onCredential(idToken);
    } catch (err) {
      onError?.(friendlyMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      fullWidth
      variant="outlined"
      size="large"
      startIcon={loading ? <CircularProgress size={18} /> : <GoogleIcon />}
      onClick={() => void handleClick()}
      disabled={loading}
    >
      {loading ? "Signing in…" : "Continue with Google"}
    </Button>
  );
}
