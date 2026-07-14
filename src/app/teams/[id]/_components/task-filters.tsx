"use client";

import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CloseIcon from "@mui/icons-material/Close";
import FilterListOffIcon from "@mui/icons-material/FilterListOff";
import SearchIcon from "@mui/icons-material/Search";

import {
  CATEGORY_OPTIONS,
  DUE_OPTIONS,
  PRIORITY_OPTIONS,
  SORT_OPTIONS,
  STATUS_OPTIONS,
  dueParams,
} from "./task-meta";
import type { DuePreset } from "./task-meta";
import type { Membership } from "@/types/membership";
import type {
  TaskCategory,
  TaskListParams,
  TaskPriority,
  TaskSort,
  TaskStatus,
} from "@/types/task";

/** Everything the filter bar controls. `"all"` and `""` are the "no filter"
 *  values — a `<TextField select>` can't hold `undefined` without going
 *  uncontrolled, so the empty case gets a real value and is dropped on the way
 *  out in `toListParams`. */
export interface TaskFilterState {
  status: TaskStatus | "all";
  priority: TaskPriority | "all";
  category: TaskCategory | "all";
  assigneeId: string;
  due: DuePreset;
  sort: TaskSort;
}

export const DEFAULT_FILTERS: TaskFilterState = {
  status: "all",
  priority: "all",
  category: "all",
  assigneeId: "",
  due: "any",
  sort: "newest",
};

/** Sort is an ordering, not a filter — changing it doesn't mean "you're hiding
 *  things", so it isn't what the Clear button offers to undo. */
export function hasActiveFilters(filters: TaskFilterState, search: string): boolean {
  return (
    Boolean(search.trim()) ||
    filters.status !== "all" ||
    filters.priority !== "all" ||
    filters.category !== "all" ||
    filters.assigneeId !== "" ||
    filters.due !== "any"
  );
}

/** Fold the bar's state into the query string the API actually takes. */
export function toListParams(filters: TaskFilterState, query: string): TaskListParams {
  return {
    // The API caps `q` at 200 characters and 422s past that. Truncate rather
    // than turn a pasted wall of text into a red error banner.
    q: query ? query.slice(0, 200) : undefined,
    status: filters.status === "all" ? undefined : filters.status,
    priority: filters.priority === "all" ? undefined : filters.priority,
    category: filters.category === "all" ? undefined : filters.category,
    assigneeId: filters.assigneeId || undefined,
    sort: filters.sort,
    ...dueParams(filters.due),
  };
}

export function TaskFilterBar({
  filters,
  onChange,
  search,
  onSearchChange,
  members,
  currentUserId,
  total,
  loading,
}: {
  filters: TaskFilterState;
  onChange: (next: TaskFilterState) => void;
  /** The raw input. Debounced by the parent before it becomes a request. */
  search: string;
  onSearchChange: (value: string) => void;
  members: Membership[];
  currentUserId: string;
  total: number;
  loading: boolean;
}) {
  const set = <K extends keyof TaskFilterState>(key: K, value: TaskFilterState[K]) =>
    onChange({ ...filters, [key]: value });

  const active = hasActiveFilters(filters, search);

  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack spacing={1.5}>
        <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1.5 }}>
          <TextField
            size="small"
            placeholder="Search tasks…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            sx={{ flexGrow: 1, minWidth: 220 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: search ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      aria-label="Clear search"
                      onClick={() => onSearchChange("")}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : undefined,
              },
            }}
          />

          <TextField
            select
            size="small"
            label="Status"
            value={filters.status}
            onChange={(e) => set("status", e.target.value as TaskFilterState["status"])}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="all">Any status</MenuItem>
            {STATUS_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            size="small"
            label="Priority"
            value={filters.priority}
            onChange={(e) => set("priority", e.target.value as TaskFilterState["priority"])}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="all">Any priority</MenuItem>
            {PRIORITY_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            size="small"
            label="Category"
            value={filters.category}
            onChange={(e) => set("category", e.target.value as TaskFilterState["category"])}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="all">Any category</MenuItem>
            {CATEGORY_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            size="small"
            label="Assignee"
            value={filters.assigneeId}
            onChange={(e) => set("assigneeId", e.target.value)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">Anyone</MenuItem>
            {members.map(({ user }) => (
              <MenuItem key={user.id} value={user.id}>
                {user.full_name || user.email}
                {user.id === currentUserId ? " (you)" : ""}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            size="small"
            label="Deadline"
            value={filters.due}
            onChange={(e) => set("due", e.target.value as DuePreset)}
            sx={{ minWidth: 160 }}
          >
            {DUE_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            size="small"
            label="Sort"
            value={filters.sort}
            onChange={(e) => set("sort", e.target.value as TaskSort)}
            sx={{ minWidth: 180 }}
          >
            {SORT_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: "center", justifyContent: "space-between" }}
        >
          <Typography variant="body2" color="text.secondary">
            {loading ? "Loading…" : `${total} ${total === 1 ? "task" : "tasks"}`}
            {active && !loading ? " match these filters" : ""}
          </Typography>
          {active && (
            <Button
              size="small"
              startIcon={<FilterListOffIcon fontSize="small" />}
              onClick={() => {
                onSearchChange("");
                // Sort survives a clear: it isn't hiding anything.
                onChange({ ...DEFAULT_FILTERS, sort: filters.sort });
              }}
            >
              Clear filters
            </Button>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}
