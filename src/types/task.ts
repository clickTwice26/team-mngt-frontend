/** Domain types mirroring the backend API contract (schemas/task.py). */

import type { MembershipUser } from "@/types/membership";

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskCategory =
  | "general"
  | "feature"
  | "bug"
  | "improvement"
  | "design"
  | "research"
  | "documentation"
  | "maintenance";
export type AttachmentKind = "image" | "audio" | "video" | "markdown" | "file";

export type TaskSort = "newest" | "oldest" | "deadline" | "updated";

/** The query string of `GET /teams/{id}/tasks`. Filtering and paging both run
 *  server-side, over the whole task list rather than the page in hand. */
export interface TaskListParams {
  q?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: TaskCategory;
  assigneeId?: string;
  /** A deadline window as absolute instants. The client computes it, because
   *  "this week" is a local-calendar notion the server can't infer. */
  dueFrom?: string;
  dueTo?: string;
  /** Only tasks with no deadline at all. */
  dueUnset?: boolean;
  /** Deadline passed and not done — matches `isOverdue`. */
  overdue?: boolean;
  /** Hide done tasks (used by "My Tasks" to hide completed by default). */
  excludeDone?: boolean;
  sort?: TaskSort;
  limit?: number;
  offset?: number;
}

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
  category: TaskCategory;
  deadline: string | null;
  created_by: MembershipUser;
  assignees: MembershipUser[];
  attachments: TaskAttachment[];
  created_at: string;
  updated_at: string;
  /** Present only in the cross-team "My Tasks" view; null on a team board. */
  team_name?: string | null;
  company_id?: string | null;
  company_name?: string | null;
}

export interface TaskCreate {
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  category?: TaskCategory;
  deadline?: string | null;
  assignee_ids?: string[];
  attachments?: TaskAttachment[];
}

export interface TaskUpdate {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: TaskCategory;
  deadline?: string | null;
  assignee_ids?: string[];
  attachments?: TaskAttachment[];
}
