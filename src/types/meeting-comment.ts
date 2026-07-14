/** Domain types mirroring the backend API contract (schemas/meeting_comment.py). */

import type { MembershipUser } from "@/types/membership";
import type { TaskAttachment } from "@/types/task";

export interface MeetingComment {
  id: string;
  meeting_id: string;
  author: MembershipUser;
  body: string;
  parent_id: string | null;
  attachments: TaskAttachment[];
  replies: MeetingComment[];
  created_at: string;
  deletable_until: string;
}

export interface MeetingCommentCreate {
  body: string;
  parent_id?: string | null;
  attachments?: TaskAttachment[];
}
