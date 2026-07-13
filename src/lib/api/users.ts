/** Typed API functions for the user directory (super admin) and account
 * administration (platform developer only). */

import { apiClient } from "@/lib/api/client";
import type { Page } from "@/types/team";
import type { AdminUserUpdate, User } from "@/types/auth";

const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` });

export const usersApi = {
  list: (token: string, params?: { search?: string; limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.limit != null) query.set("limit", String(params.limit));
    if (params?.offset != null) query.set("offset", String(params.offset));
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return apiClient.get<Page<User>>(`/users${suffix}`, {
      cache: "no-store",
      headers: authHeaders(token),
    });
  },

  update: (token: string, id: string, payload: AdminUserUpdate) =>
    apiClient.patch<User>(`/users/${id}`, payload, { headers: authHeaders(token) }),

  remove: (token: string, id: string) =>
    apiClient.delete<{ message: string }>(`/users/${id}`, { headers: authHeaders(token) }),
};
