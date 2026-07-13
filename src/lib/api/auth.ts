/** Typed API functions for authentication. */

import { apiClient } from "@/lib/api/client";
import type { AuthToken, LoginPayload, RegisterPayload, User } from "@/types/auth";

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
