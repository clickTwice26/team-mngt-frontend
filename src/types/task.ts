/** Domain types mirroring the backend API contract (schemas/task.py). */

import type { MembershipUser } from "@/types/membership";

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type AttachmentKind = "image" | "audio" | "video" | "file";

export interface TaskAttachment {
  url: string;
  filename: string;
  content_type: string;
  size: number;
  kind: AttachmentKind;
}

export interface Task {
  id: string;
  team_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: string | null;
  created_by: MembershipUser;
  assignees: MembershipUser[];
  attachments: TaskAttachment[];
  created_at: string;
  updated_at: string;
}

export interface TaskCreate {
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  deadline?: string | null;
  assignee_ids?: string[];
  attachments?: TaskAttachment[];
}

export interface TaskUpdate {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  deadline?: string | null;
  assignee_ids?: string[];
  attachments?: TaskAttachment[];
}
