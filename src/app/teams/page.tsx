"use client";

import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";

import { AppShell } from "@/components/layout/app-shell";
import { teamsApi } from "@/lib/api/teams";
import type { Team } from "@/types/team";

type State =
  | { kind: "loading" }
  | { kind: "ok"; teams: Team[]; total: number }
  | { kind: "error"; message: string };

export default function TeamsPage() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let active = true;
    teamsApi
      .list({ limit: 50 })
      .then((page) => {
        if (active) setState({ kind: "ok", teams: page.items, total: page.total });
      })
      .catch((err: unknown) => {
        if (active) {
          setState({
            kind: "error",
            message: err instanceof Error ? err.message : "Failed to load teams.",
          });
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <AppShell>
      <Stack spacing={3}>
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            Teams
          </Typography>
          {state.kind === "ok" && (
            <Chip label={`${state.total} total`} size="small" variant="outlined" />
          )}
        </Stack>

        {state.kind === "loading" && (
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <CircularProgress size={20} />
            <Typography color="text.secondary">Loading teams…</Typography>
          </Stack>
        )}

        {state.kind === "error" && <Alert severity="error">{state.message}</Alert>}

        {state.kind === "ok" && state.teams.length === 0 && (
          <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">
              No teams yet. Create one via the API to see it here.
            </Typography>
          </Paper>
        )}

        {state.kind === "ok" && state.teams.length > 0 && (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {state.teams.map((team) => (
                  <TableRow key={team.id} hover>
                    <TableCell>{team.name}</TableCell>
                    <TableCell>
                      <Typography color="text.secondary" variant="body2">
                        {team.description || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={team.is_active ? "Active" : "Inactive"}
                        color={team.is_active ? "success" : "default"}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography color="text.secondary" variant="body2">
                        {new Date(team.created_at).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Stack>
    </AppShell>
  );
}
