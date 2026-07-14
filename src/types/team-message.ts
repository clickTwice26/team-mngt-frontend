/** Domain types mirroring the backend API contract (schemas/team_message.py). */

import type { MembershipUser } from "@/types/membership";
import type { TaskAttachment } from "@/types/task";

/** The reactions a message may carry. Mirrors REACTIONS in core/reactions.py —
 *  the server rejects anything outside this set. */
export const REACTION_CHOICES = ["👍", "👎", "❤️", "🎉", "😄", "🚀", "👀", "✅"] as const;

export interface TeamMessage {
  id: string;
  team_id: string;
  author: MembershipUser;
  body: string;
  /** null for a top-level message; otherwise the message it replies to. */
  parent_id: string | null;
  attachments: TaskAttachment[];
  /** Replies, oldest first. Always empty on a reply — threading is one level deep. */
  replies: TeamMessage[];
  /** Emoji -> the ids of everyone who reacted with it. Ids rather than a count,
   *  so we can show which are yours without asking again. */
  reactions: Record<string, string[]>;
  created_at: string;
  /** ISO instant after which the author can no longer delete this message. */
  deletable_until: string;
}

export interface TeamMessageCreate {
  body: string;
  parent_id?: string | null;
  attachments?: TaskAttachment[];
}

/** What the discussion socket pushes. The socket is read-only: these only ever
 *  travel server → client. See api/v1/endpoints/discussion.py. */
export type DiscussionEvent =
  /** The handshake succeeded. An open socket only means TCP came up; this means
   *  the server accepted us into the team's room. */
  | { type: "ready" }
  /** Server heartbeat, so an idle socket isn't mistaken for a dead one. */
  | { type: "ping" }
  | { type: "message.created"; message: TeamMessage }
  /** The message changed in place — today, that means someone reacted. Carries
   *  the whole message, so simultaneous reactions converge on the server's view
   *  rather than each client incrementing its own stale count. */
  | { type: "message.updated"; message: TeamMessage }
  | { type: "message.deleted"; id: string };
