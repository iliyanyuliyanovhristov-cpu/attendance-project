// src/auth.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import request, {
  setToken as saveToken,
  clearToken as dropToken,
  getToken,
} from "./lib/api";

type Role = "SUPER_ADMIN" | "COMPANY_ADMIN" | "USER";

export type Me = {
  id: string;
  email: string;
  role: Role;
  fullName?: string;
};

type LoginResponse = {
  token: string;
  user: Me;
};

type AuthContextValue = {
  user: Me | null;
  token: string | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const Ctx = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = getToken();
    if (t) setToken(t);
    const cachedUser = localStorage.getItem("user");
    if (cachedUser) {
      try {
        setUser(JSON.parse(cachedUser));
      } catch {
        localStorage.removeItem("user");
      }
    }
    setReady(true);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await request<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    saveToken(res.token);
    setToken(res.token);
    localStorage.setItem("user", JSON.stringify(res.user));
    // companyId vs. saklamıyoruz; sayfalar “my-*” uçlarını kullanacak.
    setUser(res.user);
  };

  const logout = () => {
    dropToken();
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, token, ready, login, logout }),
    [user, token, ready]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}
