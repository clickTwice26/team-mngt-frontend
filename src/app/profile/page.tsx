"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import VerifiedIcon from "@mui/icons-material/Verified";

import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/context/auth-context";
import { authApi } from "@/lib/api/auth";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

type UploadState = { kind: "idle" } | { kind: "uploading" } | { kind: "error"; message: string };

export default function ProfilePage() {
  const router = useRouter();
  const { user, token, loading, isAuthenticated, updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadState, setUploadState] = useState<UploadState>({ kind: "idle" });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) router.replace("/login");
  }, [loading, isAuthenticated, router]);

  // Revoke any object URL we created for the local preview on unmount/change.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (loading || !user || !token) {
    return (
      <AppShell>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <CircularProgress size={20} />
          <Typography color="text.secondary">Loading profile…</Typography>
        </Stack>
      </AppShell>
    );
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadState({ kind: "error", message: "Use a JPEG, PNG, WEBP, or GIF image." });
      return;
    }
    if (file.size > MAX_BYTES) {
      setUploadState({ kind: "error", message: "Image must be smaller than 5MB." });
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setUploadState({ kind: "uploading" });
    try {
      const updated = await authApi.uploadAvatar(token, file);
      updateUser(updated);
      setUploadState({ kind: "idle" });
    } catch (err) {
      setUploadState({
        kind: "error",
        message: err instanceof Error ? err.message : "Failed to upload image.",
      });
    } finally {
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
    }
  };

  const avatarSrc = previewUrl ?? user.avatar_url ?? undefined;
  const initial = (user.full_name || user.email).charAt(0).toUpperCase();
  const uploading = uploadState.kind === "uploading";

  return (
    <AppShell>
      <Stack spacing={3} sx={{ maxWidth: 560 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
          Profile
        </Typography>

        {uploadState.kind === "error" && (
          <Alert severity="error" onClose={() => setUploadState({ kind: "idle" })}>
            {uploadState.message}
          </Alert>
        )}

        <Paper variant="outlined" sx={{ p: 4 }}>
          <Stack spacing={3} sx={{ alignItems: "center" }}>
            <Box sx={{ position: "relative", width: 128, height: 128 }}>
              <Avatar
                src={avatarSrc}
                sx={{
                  width: 128,
                  height: 128,
                  fontSize: 48,
                  bgcolor: "secondary.main",
                  opacity: uploading ? 0.5 : 1,
                }}
              >
                {initial}
              </Avatar>
              {uploading && (
                <CircularProgress
                  size={128}
                  sx={{ position: "absolute", top: 0, left: 0 }}
                />
              )}
              <IconButton
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                aria-label="Change profile picture"
                sx={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  "&:hover": { bgcolor: "primary.dark" },
                }}
                size="small"
              >
                <CameraAltIcon fontSize="small" />
              </IconButton>
              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_TYPES.join(",")}
                hidden
                onChange={(e) => void handleFileChange(e)}
              />
            </Box>

            <Stack spacing={1} sx={{ alignItems: "center" }}>
              <Typography variant="h6">{user.full_name || "Unnamed user"}</Typography>
              <Typography color="text.secondary">{user.email}</Typography>
            </Stack>

            <Stack direction="row" spacing={1}>
              <Chip
                label={user.auth_provider === "google" ? "Google account" : "Email & password"}
                size="small"
                variant="outlined"
              />
              {user.is_verified && (
                <Chip icon={<VerifiedIcon />} label="Verified" size="small" color="success" />
              )}
            </Stack>

            <Typography variant="caption" color="text.secondary">
              Member since {new Date(user.created_at).toLocaleDateString()}
            </Typography>
          </Stack>
        </Paper>
      </Stack>
    </AppShell>
  );
}
