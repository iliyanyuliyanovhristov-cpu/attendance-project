// src/lib/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";

type AuthCtx = {
  token: string | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (t) setToken(t);
    setReady(true);
  }, []);

  async function login(email: string, password: string) {
    // DEMO: backend’e istek yerine direkt sahte token.
    // İster hemen backend'e bağlayabiliriz:
    // const r = await fetch("http://localhost:4000/api/auth/login",{...});
    // const { token } = await r.json();
    const fake = "demo-token";
    localStorage.setItem("token", fake);
    setToken(fake);
  }

  function logout() {
    localStorage.removeItem("token");
    setToken(null);
  }

  return (
    <Ctx.Provider value={{ token, ready, login, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}
