/** Domain types mirroring the backend API contract (schemas/work_log_comment.py). */

import type { MembershipUser } from "@/types/membership";
import type { TaskAttachment } from "@/types/task";

export interface WorkLogComment {
  id: string;
  entry_id: string;
  author: MembershipUser;
  body: string;
  /** null for a top-level comment; otherwise the comment it replies to. */
  parent_id: string | null;
  attachments: TaskAttachment[];
  /** Replies, oldest first. Always empty on a reply — threading is one level deep. */
  replies: WorkLogComment[];
  created_at: string;
}

export interface WorkLogCommentCreate {
  body: string;
  parent_id?: string | null;
  attachments?: TaskAttachment[];
}
