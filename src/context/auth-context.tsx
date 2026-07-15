"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { authApi } from "@/lib/api/auth";
import { AUTH_EXPIRED_EVENT } from "@/lib/api/client";
import type {
  ImpersonationContext,
  LoginPayload,
  RegisterPayload,
  Session,
  User,
} from "@/types/auth";

// The real access and refresh tokens live in httpOnly cookies the browser
// attaches automatically — JavaScript can't read them. Components still receive
// a `token` from this context and pass it to the API layer; it's now just a
// non-secret marker that a cookie session exists (truthy ⇒ signed in). The
// backend authenticates from the cookie and ignores whatever rides in the
// Authorization header, so the marker's value is irrelevant on the wire.
const SESSION_MARKER = "cookie-session";

interface AuthContextValue {
  user: User | null;
  /** Non-secret marker: truthy while a cookie session exists. See note above. */
  token: string | null;
  /** True until the initial session check completes. */
  loading: boolean;
  isAuthenticated: boolean;
  /**
   * Non-null while a platform developer is acting as someone else. `user` is
   * then the person being acted as; this is the developer behind it.
   */
  impersonation: ImpersonationContext | null;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Start acting as `userId`. Platform developers only — the backend enforces it. */
  startImpersonation: (userId: string) => Promise<void>;
  /** End the session and return to the developer's own account. */
  stopImpersonation: () => Promise<void>;
  /** Replace the current user (e.g. after a profile/avatar update). */
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [impersonation, setImpersonation] = useState<ImpersonationContext | null>(null);
  const [loading, setLoading] = useState(true);

  const persist = useCallback((result: Session) => {
    setUser(result.user);
    // An ordinary sign-in returns null here — which is also what clears the
    // impersonation state when a session ends.
    setImpersonation(result.impersonation);
  }, []);

  // Local-only sign-out: forget the user without calling the server. Used when
  // the session is already gone (refresh failed, revoked from another device).
  const clearSession = useCallback(() => {
    setUser(null);
    setImpersonation(null);
  }, []);

  const logout = useCallback(async () => {
    try {
      // Revoke the session in Redis and drop the cookies. Best-effort: even if
      // the call fails, we still forget the user locally.
      await authApi.logout();
    } catch {
      // ignore — clearing local state below is what matters to the user
    }
    clearSession();
  }, [clearSession]);

  // On first load, hydrate from the session cookie. `session` rather than `me`,
  // so a reload in the middle of an impersonation comes back still impersonating
  // instead of quietly looking like a normal session. No cookie ⇒ the request
  // 401s and we simply stay signed out.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const current = await authApi.session();
        if (!cancelled) {
          setUser(current.user);
          setImpersonation(current.impersonation);
        }
      } catch {
        // Not signed in (or the session lapsed) — nothing to restore.
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // A request's access token expired and refresh couldn't renew it — the
  // session is truly over. Drop back to signed-out without another API call.
  useEffect(() => {
    const onExpired = () => clearSession();
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, [clearSession]);

  const login = useCallback(
    async (payload: LoginPayload) => persist(await authApi.login(payload)),
    [persist],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => persist(await authApi.register(payload)),
    [persist],
  );

  const loginWithGoogle = useCallback(
    async (idToken: string) => persist(await authApi.loginWithGoogle(idToken)),
    [persist],
  );

  const startImpersonation = useCallback(
    async (userId: string) => persist(await authApi.impersonate(userId)),
    [persist],
  );

  const stopImpersonation = useCallback(async () => {
    try {
      // Drops the impersonation cookie and returns the developer's own session.
      persist(await authApi.stopImpersonation());
    } catch {
      // The impersonation is already gone server-side (expired, or revoked from
      // another tab). The developer's own session cookie is still underneath, so
      // reload the real session rather than signing out entirely.
      try {
        persist(await authApi.session());
      } catch {
        clearSession();
      }
    }
  }, [persist, clearSession]);

  // The backend stops honouring the impersonation at `expires_at` regardless —
  // this is the client half. Leave the moment it lapses, so a developer who
  // wandered off mid-impersonation doesn't sit there looking like the target.
  useEffect(() => {
    if (!impersonation) return;
    const remaining = new Date(impersonation.expires_at).getTime() - Date.now();
    // Clamped rather than branched: an already-lapsed session exits on the next
    // tick instead of synchronously inside the effect.
    const handle = setTimeout(() => void stopImpersonation(), Math.max(0, remaining));
    return () => clearTimeout(handle);
  }, [impersonation, stopImpersonation]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token: user ? SESSION_MARKER : null,
      loading,
      isAuthenticated: Boolean(user),
      impersonation,
      login,
      register,
      loginWithGoogle,
      logout,
      startImpersonation,
      stopImpersonation,
      updateUser: setUser,
    }),
    [
      user,
      loading,
      impersonation,
      login,
      register,
      loginWithGoogle,
      logout,
      startImpersonation,
      stopImpersonation,
    ],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error("useAuth must be used within an <AuthProvider>.");
  }
  return ctx;
}
