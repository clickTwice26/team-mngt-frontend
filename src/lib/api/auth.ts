/** Typed API functions for authentication. */

import { apiClient } from "@/lib/api/client";
import type {
  AuthToken,
  LoginPayload,
  RegisterPayload,
  Session,
  User,
} from "@/types/auth";

export const authApi = {
  register: (payload: RegisterPayload) =>
    apiClient.post<AuthToken>("/auth/register", payload),

  login: (payload: LoginPayload) =>
    apiClient.post<AuthToken>("/auth/login", payload),

  loginWithGoogle: (idToken: string) =>
    apiClient.post<AuthToken>("/auth/google", { id_token: idToken }),

  me: (token: string) =>
    apiClient.get<User>("/auth/me", {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    }),

  /**
   * The user *and* any impersonation in flight. Hydration uses this rather than
   * `me`, so reloading mid-impersonation comes back still impersonating instead
   * of quietly looking like an ordinary session.
   */
  session: (token: string) =>
    apiClient.get<Session>("/auth/session", {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    }),

  /** Start acting as `userId`. Platform developers only; 10-minute token. */
  impersonate: (token: string, userId: string) =>
    apiClient.post<AuthToken>(`/auth/impersonate/${userId}`, undefined, {
      headers: { Authorization: `Bearer ${token}` },
    }),

  /**
   * End the session and get the developer's own account back. The actor's
   * original token is never kept client-side — the backend mints a fresh one
   * from the impersonation token's actor claim.
   */
  stopImpersonation: (token: string) =>
    apiClient.post<AuthToken>("/auth/impersonate/stop", undefined, {
      headers: { Authorization: `Bearer ${token}` },
    }),

  setPassword: (
    token: string,
    payload: { current_password?: string; new_password: string },
  ) =>
    apiClient.post<User>("/auth/me/password", payload, {
      headers: { Authorization: `Bearer ${token}` },
    }),

  uploadAvatar: (token: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.upload<User>("/auth/me/avatar", formData, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};
