/** Presentation helpers for a task's status, priority, category, and deadline.
 *
 * Shared by the tasks tab and the task discussion page so both render the same
 * labels and colours — and by the filter bar, whose dropdowns are derived from
 * the label maps below rather than hand-listed, so a new category can't show up
 * on a card while going missing from the filter. */

import dayjs from "dayjs";

import type { Task, TaskCategory, TaskListParams, TaskPriority, TaskStatus } from "@/types/task";

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

export const STATUS_COLORS: Record<TaskStatus, "default" | "info" | "success"> = {
  todo: "default",
  in_progress: "info",
  done: "success",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const PRIORITY_COLORS: Record<TaskPriority, "default" | "info" | "warning" | "error"> = {
  low: "default",
  medium: "info",
  high: "warning",
  urgent: "error",
};

export const CATEGORY_LABELS: Record<TaskCategory, string> = {
  general: "General",
  feature: "Feature",
  bug: "Bug",
  improvement: "Improvement",
  design: "Design",
  research: "Research",
  documentation: "Documentation",
  maintenance: "Maintenance",
};

/** Category chips are rendered *outlined*, so these tints read as a quiet second
 *  dimension rather than competing with the filled priority and status chips. */
export const CATEGORY_COLORS: Record<
  TaskCategory,
  "default" | "primary" | "secondary" | "info" | "success" | "warning" | "error"
> = {
  general: "default",
  feature: "primary",
  bug: "error",
  improvement: "success",
  design: "secondary",
  research: "info",
  documentation: "default",
  maintenance: "warning",
};

// --- Dropdown options ---------------------------------------------------------

export interface Option<T> {
  value: T;
  label: string;
}

const toOptions = <T extends string>(labels: Record<T, string>): Option<T>[] =>
  (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));

export const STATUS_OPTIONS = toOptions(STATUS_LABELS);
export const PRIORITY_OPTIONS = toOptions(PRIORITY_LABELS);
export const CATEGORY_OPTIONS = toOptions(CATEGORY_LABELS);

export const SORT_OPTIONS: Option<NonNullable<TaskListParams["sort"]>>[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "deadline", label: "Deadline (soonest)" },
  { value: "updated", label: "Recently updated" },
];

// --- The deadline filter ------------------------------------------------------

export type DuePreset = "any" | "overdue" | "today" | "week" | "month" | "none";

export const DUE_OPTIONS: Option<DuePreset>[] = [
  { value: "any", label: "Any time" },
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Due today" },
  { value: "week", label: "Due this week" },
  { value: "month", label: "Due this month" },
  { value: "none", label: "No deadline" },
];

/**
 * Turn a deadline preset into query params.
 *
 * The window is resolved here, on the client, and sent as absolute instants:
 * "this week" is a local-calendar notion, and a server asked to interpret it
 * would have to guess a timezone. `overdue` and `none` aren't windows at all,
 * so they travel as their own flags.
 */
export function dueParams(preset: DuePreset): Pick<
  TaskListParams,
  "dueFrom" | "dueTo" | "dueUnset" | "overdue"
> {
  switch (preset) {
    case "overdue":
      return { overdue: true };
    case "none":
      return { dueUnset: true };
    case "today":
      return {
        dueFrom: dayjs().startOf("day").toISOString(),
        dueTo: dayjs().endOf("day").toISOString(),
      };
    case "week":
      return {
        dueFrom: dayjs().startOf("week").toISOString(),
        dueTo: dayjs().endOf("week").toISOString(),
      };
    case "month":
      return {
        dueFrom: dayjs().startOf("month").toISOString(),
        dueTo: dayjs().endOf("month").toISOString(),
      };
    default:
      return {};
  }
}

/**
 * A ticking countdown label for a deadline: `"2d 03:15:42"`, `"04:09:59"`.
 *
 * Sign-agnostic — it formats the *magnitude* of the gap, so the caller decides
 * whether that reads as "Due in …" or "Overdue by …". Days appear only once
 * there's at least one, so a same-day deadline stays a clean `HH:MM:SS`.
 */
export function formatCountdown(ms: number): string {
  const total = Math.floor(Math.abs(ms) / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  const clock = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return days > 0 ? `${days}d ${clock}` : clock;
}

/** A deadline is an instant now, so show the time alongside the date. */
export function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Overdue once the deadline instant has passed — and never for a done task.
 *
 * This used to stretch the deadline to 23:59 of its day, because a deadline was
 * only ever a date. Now that it carries a time, honouring it literally is the
 * whole point: "due at 2pm" means overdue at 2:01pm, not at midnight.
 */
export function isOverdue(task: Task): boolean {
  if (!task.deadline || task.status === "done") return false;
  return new Date(task.deadline).getTime() < Date.now();
}
