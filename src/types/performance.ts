/** Domain types mirroring the backend API contract (schemas/performance.py). */

import type { MembershipUser } from "@/types/membership";
import type { WorkMode } from "@/types/membership";

export interface TaskCounts {
  total: number;
  todo: number;
  in_progress: number;
  done: number;
  /** Open (not done) tasks whose deadline has passed. */
  overdue: number;
}

export interface PriorityCounts {
  low: number;
  medium: number;
  high: number;
  urgent: number;
}

export interface DailyHours {
  /** YYYY-MM-DD */
  day: string;
  minutes: number;
}

export interface WeeklyHours {
  /** YYYY-MM-DD, the Monday of the week. */
  week_start: string;
  minutes: number;
  /** null when the member isn't hourly. */
  target_minutes: number | null;
}

export interface MemberPerformance {
  user: MembershipUser;
  work_mode: WorkMode;
  hours_per_week: number | null;
  tasks: TaskCounts;
  priorities: PriorityCounts;
  /** Share of assigned tasks that are done, 0–100. */
  completion_rate: number;
  /** Every day in the window, zeros included. */
  daily_hours: DailyHours[];
  weekly_hours: WeeklyHours[];
  minutes_last_30_days: number;
}
