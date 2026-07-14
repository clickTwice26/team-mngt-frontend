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

export function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** A deadline counts as missed only once its whole day has passed — and never
 *  for a task that's already done. */
export function isOverdue(task: Task): boolean {
  if (!task.deadline || task.status === "done") return false;
  const end = new Date(task.deadline);
  end.setHours(23, 59, 59, 999);
  return end.getTime() < Date.now();
}
