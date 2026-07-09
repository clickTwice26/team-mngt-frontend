/** Typed API functions for the user directory (super admin only). */

import { apiClient } from "@/lib/api/client";
import type { Page } from "@/types/team";
import type { User } from "@/types/auth";

export const usersApi = {
  list: (token: string, params?: { search?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.limit != null) query.set("limit", String(params.limit));
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return apiClient.get<Page<User>>(`/users${suffix}`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};
