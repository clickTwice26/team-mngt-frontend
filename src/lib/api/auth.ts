/** Typed API functions for authentication.
 *
 * Auth rides in httpOnly cookies (see `lib/api/client`), so none of these pass
 * a token — the browser attaches the session automatically. Sign-in endpoints
 * return the `Session` (user + any impersonation); the tokens themselves are set
 * as cookies the response, and page JavaScript, can never read.
 */

import { apiClient } from "@/lib/api/client";
import type {
  LoginPayload,
  RegisterPayload,
  Session,
  SessionDevice,
  User,
} from "@/types/auth";

export const authApi = {
  register: (payload: RegisterPayload) =>
    apiClient.post<Session>("/auth/register", payload),

  login: (payload: LoginPayload) => apiClient.post<Session>("/auth/login", payload),

  loginWithGoogle: (idToken: string) =>
    apiClient.post<Session>("/auth/google", { id_token: idToken }),

  me: () => apiClient.get<User>("/auth/me", { cache: "no-store" }),

  /**
   * The user *and* any impersonation in flight. Hydration uses this rather than
   * `me`, so reloading mid-impersonation comes back still impersonating instead
   * of quietly looking like an ordinary session.
   */
  session: () => apiClient.get<Session>("/auth/session", { cache: "no-store" }),

  /** Rotate the refresh cookie and mint a fresh access cookie. The client
   * wrapper calls this automatically on a 401; rarely needed by hand. */
  refresh: () => apiClient.post<Session>("/auth/refresh"),

  /** Sign out this device: revoke the session server-side and drop the cookies. */
  logout: () => apiClient.post<void>("/auth/logout"),

  /** Start acting as `userId`. Platform developers only; 10-minute session. */
  impersonate: (userId: string) =>
    apiClient.post<Session>(`/auth/impersonate/${userId}`),

  /** End the impersonation and return to the developer's own account. */
  stopImpersonation: () => apiClient.post<Session>("/auth/impersonate/stop"),

  setPassword: (payload: { current_password?: string; new_password: string }) =>
    apiClient.post<User>("/auth/me/password", payload),

  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.upload<User>("/auth/me/avatar", formData);
  },

  // --- Active sessions ("where am I logged in") ------------------------------

  listSessions: () => apiClient.get<SessionDevice[]>("/auth/sessions", { cache: "no-store" }),

  revokeSession: (sessionId: string) =>
    apiClient.delete<void>(`/auth/sessions/${sessionId}`),

  /** Sign out every *other* device, keeping the current one. */
  logoutEverywhere: () => apiClient.post<void>("/auth/sessions/logout-all"),
};
