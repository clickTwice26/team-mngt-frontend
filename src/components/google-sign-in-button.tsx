"use client";

import { useState } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Tooltip from "@mui/material/Tooltip";
import GoogleIcon from "@mui/icons-material/Google";

import { auth, firebaseConfigured } from "@/lib/firebase/client";

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
