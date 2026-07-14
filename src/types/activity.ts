/** Domain types mirroring the backend API contract (schemas/activity.py). */

import type { MembershipUser } from "@/types/membership";

export type ActivityAction =
  | "team.updated"
  | "member.added"
  | "member.removed"
  | "member.work_changed"
  | "task.created"
  | "task.updated"
  | "task.status_changed"
  | "task.deleted"
  | "meeting.scheduled"
  | "meeting.updated"
  | "meeting.rescheduled"
  | "meeting.cancelled"
  | "work_log.created"
  | "work_log.updated"
  | "work_log.deleted"
  | "comment.posted"
  | "comment.deleted";

export interface Activity {
  id: string;
  team_id: string;
  actor: MembershipUser;
  action: ActivityAction;
  subject_type: string;
  subject_id: string | null;
  /** A sentence written when the event happened — still correct after the
   *  subject is renamed or deleted. */
  summary: string;
  details: Record<string, unknown>;
  created_at: string;
}
