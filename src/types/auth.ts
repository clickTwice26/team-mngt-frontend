/** Auth domain types mirroring the backend contract (schemas/auth.py). */

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  auth_provider: "local" | "google";
  avatar_url: string | null;
  is_active: boolean;
  is_verified: boolean;
  role: PlatformRole;
  /** True for platform developers too — they clear every super-admin gate. */
  is_super_admin: boolean;
  /** False for Google-only accounts that have never set a password. */
  has_password: boolean;
  created_at: string;
}

export type PlatformRole = "member" | "super_admin" | "platform_developer";

/** Fields a platform developer may edit on another user's account. */
export interface AdminUserUpdate {
  full_name?: string | null;
  is_active?: boolean;
}

/**
 * Who is *really* behind the current session. Non-null only while a platform
 * developer is acting as someone else: `user` is then the person being acted
 * as, and this is the developer responsible for it.
 */
export interface ImpersonationContext {
  actor_id: string;
  actor_email: string;
  actor_name: string | null;
  session_id: string;
  /** ISO timestamp. The session is dead after this, server-side. */
  expires_at: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
  impersonation: ImpersonationContext | null;
}

/** `GET /auth/session` — the user plus any impersonation in flight. */
export interface Session {
  user: User;
  impersonation: ImpersonationContext | null;
}

/** One row of the impersonation trail (`GET /auth/impersonations`). */
export interface ImpersonationRecord {
  id: string;
  actor_id: string;
  actor_email: string;
  target_id: string;
  target_email: string;
  started_at: string;
  expires_at: string;
  ended_at: string | null;
  ended_reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
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
