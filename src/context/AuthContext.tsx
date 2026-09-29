import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { api, clearToken, setUnauthorizedHandler, storeToken } from "../lib/api";
import type { Session } from "../types";

interface AuthContextValue {
  user: Session | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(clearSession);
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  useEffect(() => {
    let cancelled = false;

    if (!localStorage.getItem("nexus_token")) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const session = await api.me();
        if (!cancelled) setUser(session);
      } catch {
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  const login = useCallback(async (username: string, password: string) => {
    const result = await api.login(username, password);
    storeToken(result.token);
    setUser(result.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // cookie may already be gone; clearing locally is what matters
    }
    clearSession();
  }, [clearSession]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await api.changePassword(currentPassword, newPassword);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
