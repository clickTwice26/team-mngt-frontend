/** Health/readiness checks against the backend. */

import { apiClient } from "@/lib/api/client";

export interface HealthStatus {
  status: string;
  environment?: string;
  database?: string;
}

export const healthApi = {
  live: () => apiClient.get<HealthStatus>("/health", { cache: "no-store" }),
  ready: () => apiClient.get<HealthStatus>("/health/ready", { cache: "no-store" }),
};
