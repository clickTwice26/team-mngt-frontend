"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import MuiLink from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import { AuthCard } from "@/components/auth-card";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { TurnstileWidget, turnstileConfigured } from "@/components/turnstile-widget";
import { useAuth } from "@/context/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithGoogle, isAuthenticated, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Turnstile token, and a key we bump to remount the widget for a fresh
  // challenge — the token is single-use, so a failed attempt needs a new one.
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaKey, setCaptchaKey] = useState(0);
  const resetCaptcha = () => {
    setCaptchaToken("");
    setCaptchaKey((key) => key + 1);
  };

  useEffect(() => {
    if (!loading && isAuthenticated) router.replace("/dashboard");
  }, [loading, isAuthenticated, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ email, password, captcha_token: captchaToken || undefined });
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
      // The token Cloudflare handed us is spent now — get a fresh one.
      if (turnstileConfigured) resetCaptcha();
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async (idToken: string) => {
    setError(null);
    try {
      await loginWithGoogle(idToken);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
    }
  };

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to your account">
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            fullWidth
            autoFocus
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            fullWidth
          />

          {turnstileConfigured && (
            <TurnstileWidget
              key={captchaKey}
              onVerify={setCaptchaToken}
              onExpire={() => setCaptchaToken("")}
              onError={() => setCaptchaToken("")}
            />
          )}

          <Button
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            disabled={submitting || (turnstileConfigured && !captchaToken)}
          >
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </Stack>
      </Box>

      <Divider sx={{ my: 3 }}>
        <Typography variant="caption" color="text.secondary">
          OR
        </Typography>
      </Divider>

      <GoogleSignInButton onCredential={handleGoogle} onError={setError} />

      <Typography variant="body2" align="center" sx={{ mt: 3 }}>
        Don&apos;t have an account?{" "}
        <MuiLink component={Link} href="/register">
          Sign up
        </MuiLink>
      </Typography>
    </AuthCard>
  );
}
