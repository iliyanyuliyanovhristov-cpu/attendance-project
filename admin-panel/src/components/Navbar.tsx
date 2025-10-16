// src/components/Navbar.tsx
import { useAuth } from "../auth";

export default function Navbar() {
  const { logout } = useAuth();

  return (
    <header className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shadow">
      <h1 className="text-xl font-semibold">Admin Panel</h1>
      <button
        onClick={logout}
        className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-white"
      >
        Logout
      </button>
    </header>
  );
}
