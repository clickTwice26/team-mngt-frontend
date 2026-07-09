/** Domain types mirroring the backend API contract (schemas/team.py). */

export interface Team {
  id: string;
  name: string;
  company_id: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamCreate {
  name: string;
  company_id: string;
  description?: string | null;
  is_active?: boolean;
}

export interface TeamUpdate {
  name?: string;
  description?: string | null;
  is_active?: boolean;
}

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
