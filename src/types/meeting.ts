/** Domain types mirroring the backend API contract (schemas/meeting.py). */

import type { MembershipUser } from "@/types/membership";
import type { TaskAttachment } from "@/types/task";

export interface Meeting {
  id: string;
  team_id: string;
  title: string;
  /** ISO instant the meeting starts. */
  scheduled_at: string;
  duration_minutes: number;
  /** The agenda — one line per topic. */
  topics: string[];
  meet_link: string | null;
  notes: string | null;
  attachments: TaskAttachment[];
  created_by: MembershipUser;
  created_at: string;
}

export interface MeetingCreate {
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  topics?: string[];
  meet_link?: string | null;
  notes?: string | null;
  attachments?: TaskAttachment[];
}

export type MeetingUpdate = Partial<MeetingCreate>;
