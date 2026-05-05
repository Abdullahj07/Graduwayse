import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { MeResponse } from "../api/auth";
import { me as meRequest } from "../api/auth";

type AuthState = {
  user: MeResponse | null;
  isLoading: boolean;
  setUser: (u: MeResponse | null) => void;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function refreshMe() {
    const access = localStorage.getItem("access");
    if (!access) {
      setUser(null);
      return;
    }
    try {
      const u = await meRequest();
      setUser(u);
    } catch {
      // token invalid/expired
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      setUser(null);
    }
  }

  function logout() {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    setUser(null);
  }

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await refreshMe();
      setIsLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, setUser, logout, refreshMe }),
    [user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
