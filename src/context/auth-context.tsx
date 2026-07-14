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
import type {
  AuthToken,
  ImpersonationContext,
  LoginPayload,
  RegisterPayload,
  User,
} from "@/types/auth";

const TOKEN_STORAGE_KEY = "tm.auth.token";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  /** True until the initial token check completes. */
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
  logout: () => void;
  /** Start acting as `userId`. Platform developers only — the backend enforces it. */
  startImpersonation: (userId: string) => Promise<void>;
  /** End the session and return to the developer's own account. */
  stopImpersonation: () => Promise<void>;
  /** Replace the current user (e.g. after a profile/avatar update). */
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [impersonation, setImpersonation] = useState<ImpersonationContext | null>(null);
  const [loading, setLoading] = useState(true);

  const persist = useCallback((result: AuthToken) => {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, result.access_token);
    setToken(result.access_token);
    setUser(result.user);
    // An ordinary sign-in returns null here — which is also what clears the
    // impersonation state when a session ends.
    setImpersonation(result.impersonation);
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
    setImpersonation(null);
  }, []);

  // On first load, hydrate the session from a stored token. `session` rather
  // than `me`, so a reload in the middle of an impersonation comes back still
  // impersonating instead of quietly looking like a normal session.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = readStoredToken();
      if (stored) {
        try {
          const current = await authApi.session(stored);
          if (!cancelled) {
            setToken(stored);
            setUser(current.user);
            setImpersonation(current.impersonation);
          }
        } catch {
          window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
    async (userId: string) => {
      if (!token) throw new Error("Not authenticated.");
      persist(await authApi.impersonate(token, userId));
    },
    [token, persist],
  );

  const stopImpersonation = useCallback(async () => {
    if (!token) throw new Error("Not authenticated.");
    try {
      // Swaps the impersonation token for a fresh one for the developer.
      persist(await authApi.stopImpersonation(token));
    } catch {
      // The session is already gone server-side (expired, or revoked from
      // another tab), so there is no account to hand back. Signing out is the
      // only honest end state: staying put would leave the app rendering as the
      // target while every request 401s.
      logout();
    }
  }, [token, persist, logout]);

  // The backend stops honouring the token at `expires_at` regardless — this is
  // the client half. Leave the session the moment it lapses, so a developer who
  // wandered off mid-impersonation doesn't sit there looking like the target.
  useEffect(() => {
    if (!impersonation) return;
    const remaining = new Date(impersonation.expires_at).getTime() - Date.now();
    // Clamped rather than branched: an already-lapsed session (a token restored
    // from storage after the tab slept, say) exits on the next tick instead of
    // synchronously inside the effect.
    const handle = setTimeout(() => void stopImpersonation(), Math.max(0, remaining));
    return () => clearTimeout(handle);
  }, [impersonation, stopImpersonation]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
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
      token,
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
