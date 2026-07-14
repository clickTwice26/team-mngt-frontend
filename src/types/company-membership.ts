/** Domain types mirroring the backend API contract (schemas/company_membership.py). */

import type { MembershipUser } from "@/types/membership";

/** Someone's role *within a company* — org structure, not permissions.
 *  A founder gets no extra access from it. */
export type CompanyRole = "employee" | "founder";

export interface CompanyMembership {
  id: string;
  company_id: string;
  user: MembershipUser;
  assigned_by: string;
  role: CompanyRole;
  created_at: string;
}
