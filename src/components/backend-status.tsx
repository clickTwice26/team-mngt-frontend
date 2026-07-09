"use client";

import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import StorageIcon from "@mui/icons-material/Storage";

import { env } from "@/config/env";
import { healthApi, type HealthStatus } from "@/lib/api/health";

type State =
  | { kind: "loading" }
  | { kind: "ok"; data: HealthStatus }
  | { kind: "error"; message: string };

/**
 * Client island that pings the FastAPI backend's readiness endpoint so the
 * landing page can show whether the API (and MongoDB) is reachable.
 */
export function BackendStatus() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let active = true;
    healthApi
      .ready()
      .then((data) => active && setState({ kind: "ok", data }))
      .catch(
        (err: unknown) =>
          active &&
          setState({
            kind: "error",
            message: err instanceof Error ? err.message : "Unreachable",
          }),
      );
    return () => {
      active = false;
    };
  }, []);

  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Typography variant="overline" color="text.secondary">
        Backend status
      </Typography>

      {state.kind === "loading" && (
        <Stack direction="row" spacing={1.5} sx={{ mt: 1, alignItems: "center" }}>
          <CircularProgress size={20} />
          <Typography>Checking backend…</Typography>
        </Stack>
      )}

      {state.kind === "ok" && (
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{ mt: 1, alignItems: "center", flexWrap: "wrap" }}
        >
          <Chip
            icon={<CheckCircleIcon />}
            color="success"
            label={`API ${state.data.status}`}
            size="small"
          />
          <Chip
            icon={<StorageIcon />}
            color={state.data.database === "connected" ? "success" : "warning"}
            variant="outlined"
            label={`DB ${state.data.database ?? "unknown"}`}
            size="small"
          />
        </Stack>
      )}

      {state.kind === "error" && (
        <Alert severity="error" sx={{ mt: 1 }}>
          <AlertTitle>Backend unreachable</AlertTitle>
          Start the backend, then reload. ({state.message})
        </Alert>
      )}

      <Box sx={{ mt: 1.5 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontFamily: "monospace" }}
        >
          {env.apiUrl}
        </Typography>
      </Box>
    </Paper>
  );
}
