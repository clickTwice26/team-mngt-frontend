/** Auth domain types mirroring the backend contract (schemas/auth.py). */

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  auth_provider: "local" | "google";
  avatar_url: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface RegisterPayload {
  email: string;
  password: string;
  full_name?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}
