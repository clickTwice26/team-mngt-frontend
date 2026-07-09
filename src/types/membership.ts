/** Domain types mirroring the backend API contract (schemas/membership.py). */

export interface MembershipUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface Membership {
  id: string;
  team_id: string;
  user: MembershipUser;
  assigned_by: string;
  created_at: string;
}
