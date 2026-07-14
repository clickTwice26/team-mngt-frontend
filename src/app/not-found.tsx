"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import HomeIcon from "@mui/icons-material/Home";
import SearchOffIcon from "@mui/icons-material/SearchOff";

import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/context/auth-context";

function NotFoundBody({ destination, label }: { destination: string; label: string }) {
  return (
    <Stack spacing={2} sx={{ alignItems: "center", textAlign: "center", py: { xs: 6, sm: 10 } }}>
      <SearchOffIcon sx={{ fontSize: 72, color: "text.disabled" }} />
      <Typography variant="h2" component="h1" sx={{ fontWeight: 700 }}>
        404
      </Typography>
      <Typography variant="h6" color="text.secondary">
        Page not found
      </Typography>
      <Typography color="text.secondary" sx={{ maxWidth: 420 }}>
        The page you&apos;re looking for doesn&apos;t exist, may have been moved, or the link is
        broken.
      </Typography>
      <Button
        component={Link}
        href={destination}
        variant="contained"
        startIcon={<HomeIcon />}
        sx={{ mt: 2 }}
      >
        {label}
      </Button>
    </Stack>
  );
}

export default function NotFound() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (isAuthenticated) {
    return (
      <AppShell>
        <NotFoundBody destination="/" label="Back to Dashboard" />
      </AppShell>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        px: 2,
      }}
    >
      <NotFoundBody destination="/login" label="Back to sign in" />
    </Box>
  );
}
