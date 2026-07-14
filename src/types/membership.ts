/** Domain types mirroring the backend API contract (schemas/membership.py). */

export interface MembershipUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

export type WorkMode = "task_based" | "hourly" | "contractual";

export type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

/** How a member is engaged on a team. Which fields carry a value depends on
 *  `mode` — the server clears the ones the mode doesn't use. */
export interface WorkArrangement {
  mode: WorkMode;
  /** Hourly only. */
  hours_per_week: number | null;
  /** Hourly only. */
  off_days: Weekday[];
  /** Contractual only. */
  commitment: string | null;
}

export interface Membership {
  id: string;
  team_id: string;
  user: MembershipUser;
  assigned_by: string;
  work: WorkArrangement;
  created_at: string;
}
