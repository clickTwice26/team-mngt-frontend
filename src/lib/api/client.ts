/**
 * A small typed fetch wrapper around the backend API.
 *
 * Auth rides in httpOnly cookies, so every request sends credentials and the
 * browser attaches the session automatically — page JavaScript never touches
 * the tokens. When a short-lived access token has expired, a request comes back
 * 401; this wrapper transparently calls `/auth/refresh` once (rotating the
 * refresh cookie) and replays the original request, so the user never sees it.
 *
 * Works in both Server Components and Client Components. Throws `ApiError` on
 * non-2xx responses so callers can handle failures explicitly.
 */

import { apiBaseUrl } from "@/config/env";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly detail?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  /** Next.js fetch cache/revalidation options. */
  next?: { revalidate?: number; tags?: string[] };
};

/** Fired when the session is truly gone (refresh failed). The auth context
 * listens for this and returns the app to a signed-out state. */
export const AUTH_EXPIRED_EVENT = "tm:auth-expired";

// Endpoints that legitimately 401 on their own — retrying them through refresh
// would be nonsensical (and, for /auth/refresh, an infinite loop).
const NO_REFRESH_PATHS = ["/auth/login", "/auth/register", "/auth/google", "/auth/refresh"];

// A single in-flight refresh shared by every request that 401s at once, so a
// burst of parallel calls triggers exactly one rotation rather than a stampede
// (which would trip the refresh-token reuse guard and kill the session).
let refreshInFlight: Promise<boolean> | null = null;

/** Rotate the session cookies. Shared by the request wrapper's 401-retry and
 * the discussion socket, which reconnects after refreshing an expired cookie. */
export async function refreshSession(): Promise<boolean> {
  if (typeof window === "undefined") return false; // never refresh server-side
  refreshInFlight ??= (async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      // Cleared on the next tick so concurrent 401s all observe this result
      // before a fresh refresh can start.
      queueMicrotask(() => {
        refreshInFlight = null;
      });
    }
  })();
  return refreshInFlight;
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
  retry = true,
): Promise<T> {
  const { body, headers, ...rest } = options;

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...rest,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 401 && retry && !NO_REFRESH_PATHS.some((p) => path.startsWith(p))) {
    if (await refreshSession()) {
      return request<T>(path, options, false); // replay once with the new cookie
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
  }

  if (!response.ok) {
    let detail: unknown;
    try {
      detail = await response.json();
    } catch {
      detail = await response.text();
    }
    const message =
      (detail as { detail?: string })?.detail ??
      `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message, detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

async function upload<T>(
  path: string,
  formData: FormData,
  options: Omit<RequestOptions, "body"> = {},
  retry = true,
): Promise<T> {
  // No Content-Type header here — the browser sets multipart/form-data with
  // the correct boundary itself; setting it manually breaks the upload.
  const { headers, ...rest } = options;
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...rest,
    method: "POST",
    credentials: "include",
    headers,
    body: formData,
  });

  if (response.status === 401 && retry && !NO_REFRESH_PATHS.some((p) => path.startsWith(p))) {
    if (await refreshSession()) {
      return upload<T>(path, formData, options, false);
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
  }

  if (!response.ok) {
    let detail: unknown;
    try {
      detail = await response.json();
    } catch {
      detail = await response.text();
    }
    const message =
      (detail as { detail?: string })?.detail ??
      `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message, detail);
  }
  return (await response.json()) as T;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
  upload,
};
