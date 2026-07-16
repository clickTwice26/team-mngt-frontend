"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import MuiLink from "@mui/material/Link";
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
import {
  DEFAULT_FILTERS,
  TaskFilterBar,
  hasActiveFilters,
  toListParams,
} from "@/components/tasks/task-filter-bar";
import type { TaskFilterState } from "@/components/tasks/task-filter-bar";
import { useAuth } from "@/context/auth-context";
import { ApiError } from "@/lib/api/client";
import { tasksApi } from "@/lib/api/tasks";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  formatDeadline,
  isOverdue,
} from "@/lib/tasks/task-meta";
import type { Task } from "@/types/task";

const PAGE_SIZE = 20;

type State =
  | { kind: "loading" }
  | { kind: "ok"; tasks: Task[]; total: number }
  | { kind: "error"; message: string };

export default function MyTasksPage() {
  const router = useRouter();
  const { user, token, loading: authLoading, isAuthenticated } = useAuth();

  const [state, setState] = useState<State>({ kind: "loading" });
  const [filters, setFilters] = useState<TaskFilterState>(DEFAULT_FILTERS);
  const [search, setSearch] = useState("");
  // Debounced search: what's actually sent, so typing doesn't fire per key.
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace("/login");
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    const id = setTimeout(() => {
      // A new search must restart at page 1, or you land past the end of a
      // shorter result set. Reset here rather than in a second cascade effect.
      setQuery((prev) => {
        const next = search.trim();
        if (next !== prev) setOffset(0);
        return next;
      });
    }, 300);
    return () => clearTimeout(id);
  }, [search]);

  const load = useCallback(() => {
    if (!token) return;
    setState({ kind: "loading" });
    tasksApi
      .listAssigned(token, { ...toListParams(filters, query), limit: PAGE_SIZE, offset })
      .then((page) => {
        // Stepped past the end (e.g. after the list shrank) — walk back.
        if (page.items.length === 0 && page.total > 0 && offset >= page.total) {
          setOffset(Math.max(0, (Math.ceil(page.total / PAGE_SIZE) - 1) * PAGE_SIZE));
          return;
        }
        setState({ kind: "ok", tasks: page.items, total: page.total });
      })
      .catch((err: unknown) =>
        setState({
          kind: "error",
          message: err instanceof ApiError ? err.message : "Failed to load your tasks.",
        }),
      );
  }, [token, filters, query, offset]);

  useEffect(() => {
    if (token) queueMicrotask(load);
  }, [token, load]);

  const changeFilters = (next: TaskFilterState) => {
    setFilters(next);
    setOffset(0);
  };

  if (authLoading || !user) {
    return (
      <AppShell>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <CircularProgress size={20} />
          <Typography color="text.secondary">Loading…</Typography>
        </Stack>
      </AppShell>
    );
  }

  const total = state.kind === "ok" ? state.total : 0;
  const rangeStart = total === 0 ? 0 : offset + 1;
  const rangeEnd = state.kind === "ok" ? offset + state.tasks.length : 0;
  const filtersActive = hasActiveFilters(filters, search);

  return (
    <AppShell>
      <Stack spacing={3}>
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            My Tasks
          </Typography>
          {state.kind === "ok" && (
            <Chip label={`${total} total`} size="small" variant="outlined" />
          )}
        </Stack>

        <Typography color="text.secondary" variant="body2" sx={{ mt: -1 }}>
          Everything assigned to you, across every team and company.
        </Typography>

        <TaskFilterBar
          filters={filters}
          onChange={changeFilters}
          search={search}
          onSearchChange={setSearch}
          total={total}
          loading={state.kind === "loading"}
          showAssignee={false}
        />

        {state.kind === "loading" && (
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <CircularProgress size={20} />
            <Typography color="text.secondary">Loading tasks…</Typography>
          </Stack>
        )}

        {state.kind === "error" && <Alert severity="error">{state.message}</Alert>}

        {state.kind === "ok" && state.tasks.length === 0 && (
          <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">
              {filtersActive
                ? "No tasks match these filters."
                : "You have no assigned tasks. Tasks assigned to you on any team show up here."}
            </Typography>
          </Paper>
        )}

        {state.kind === "ok" && state.tasks.length > 0 && (
          <>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Task</TableCell>
                    <TableCell>Where</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Deadline</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {state.tasks.map((task) => {
                    const overdue = isOverdue(task);
                    return (
                      <TableRow key={task.id} hover>
                        <TableCell>
                          <Stack spacing={0.5}>
                            <MuiLink
                              component={Link}
                              href={`/teams/${task.team_id}/tasks/${task.id}`}
                              underline="hover"
                              sx={{ fontWeight: 500 }}
                            >
                              {task.title}
                            </MuiLink>
                            <Chip
                              label={CATEGORY_LABELS[task.category]}
                              color={CATEGORY_COLORS[task.category]}
                              size="small"
                              variant="outlined"
                              sx={{ alignSelf: "flex-start" }}
                            />
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack spacing={0.25}>
                            <MuiLink
                              component={Link}
                              href={`/teams/${task.team_id}`}
                              underline="hover"
                              variant="body2"
                            >
                              {task.team_name ?? "Team"}
                            </MuiLink>
                            {task.company_name && (
                              <Typography variant="caption" color="text.secondary">
                                {task.company_name}
                              </Typography>
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={STATUS_LABELS[task.status]}
                            color={STATUS_COLORS[task.status]}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={PRIORITY_LABELS[task.priority]}
                            color={PRIORITY_COLORS[task.priority]}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {task.deadline ? (
                            <Typography
                              variant="body2"
                              color={overdue ? "error" : "text.secondary"}
                              sx={{ fontWeight: overdue ? 600 : 400 }}
                            >
                              {formatDeadline(task.deadline)}
                              {overdue ? " · Overdue" : ""}
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              —
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <Stack
              direction="row"
              spacing={2}
              sx={{ alignItems: "center", justifyContent: "space-between" }}
            >
              <Typography variant="body2" color="text.secondary">
                Showing {rangeStart}–{rangeEnd} of {total}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                >
                  Previous
                </Button>
                <Button
                  size="small"
                  disabled={offset + PAGE_SIZE >= total}
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                >
                  Next
                </Button>
              </Stack>
            </Stack>
          </>
        )}
      </Stack>
    </AppShell>
  );
}
