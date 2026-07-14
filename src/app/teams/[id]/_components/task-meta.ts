/** Presentation helpers for a task's status, priority, and deadline.
 *
 * Shared by the tasks tab and the task discussion page so both render the same
 * labels and colours. */

import type { Task, TaskPriority, TaskStatus } from "@/types/task";

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
