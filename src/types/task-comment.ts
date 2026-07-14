/** Domain types mirroring the backend API contract (schemas/task_comment.py). */

import type { MembershipUser } from "@/types/membership";
import type { TaskAttachment } from "@/types/task";

export interface TaskComment {
  id: string;
  task_id: string;
  author: MembershipUser;
  body: string;
  /** null for a top-level comment; otherwise the comment it replies to. */
  parent_id: string | null;
  attachments: TaskAttachment[];
  /** Replies, oldest first. Always empty on a reply — threading is one level deep. */
  replies: TaskComment[];
  created_at: string;
}

export interface TaskCommentCreate {
  body: string;
  parent_id?: string | null;
  attachments?: TaskAttachment[];
}
