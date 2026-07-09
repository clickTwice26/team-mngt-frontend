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
import type { AuthToken, LoginPayload, RegisterPayload, User } from "@/types/auth";

const TOKEN_STORAGE_KEY = "tm.auth.token";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  /** True until the initial token check completes. */
  loading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => void;
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
  const [loading, setLoading] = useState(true);

  const persist = useCallback((result: AuthToken) => {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, result.access_token);
    setToken(result.access_token);
    setUser(result.user);
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // On first load, hydrate the session from a stored token.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = readStoredToken();
      if (stored) {
        try {
          const me = await authApi.me(stored);
          if (!cancelled) {
            setToken(stored);
            setUser(me);
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

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(user),
      login,
      register,
      loginWithGoogle,
      logout,
      updateUser: setUser,
    }),
    [user, token, loading, login, register, loginWithGoogle, logout],
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
