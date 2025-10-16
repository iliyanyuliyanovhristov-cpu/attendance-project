// src/components/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../auth";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { token, ready } = useAuth();
  if (!ready) return null; // istersen loading koy
  if (!token) return <Navigate to="/login" replace />;
  return children;
}
