/** Domain types mirroring the backend API contract (schemas/company.py). */

export interface Company {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyCreate {
  name: string;
  description?: string | null;
  is_active?: boolean;
}

export interface CompanyUpdate {
  name?: string;
  description?: string | null;
  is_active?: boolean;
}
