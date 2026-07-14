/** Domain types mirroring the backend API contract (schemas/work_log.py). */

import type { TaskAttachment } from "@/types/task";

export interface WorkLogEntry {
  id: string;
  team_id: string;
  user_id: string;
  /** ISO timestamps. An entry may cross midnight; it may not exceed 24 hours. */
  started_at: string;
  ended_at: string;
  minutes: number;
  description: string;
  task_id: string | null;
  /** Denormalised title of the linked task, if any. */
  task_title: string | null;
  /** Any number of images, at most one video (enforced by the server). */
  attachments: TaskAttachment[];
  created_at: string;
}

export interface WorkLogCreate {
  started_at: string;
  ended_at: string;
  description: string;
  task_id?: string | null;
  attachments?: TaskAttachment[];
}

export interface WorkLogUpdate {
  started_at?: string;
  ended_at?: string;
  description?: string;
  task_id?: string | null;
  attachments?: TaskAttachment[];
}
