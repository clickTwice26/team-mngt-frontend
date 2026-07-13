/** Domain types mirroring the backend API contract (schemas/company_membership.py). */

import type { MembershipUser } from "@/types/membership";

export interface CompanyMembership {
  id: string;
  company_id: string;
  user: MembershipUser;
  assigned_by: string;
  created_at: string;
}
