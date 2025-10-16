// src/components/Sidebar.tsx
import { NavLink } from "react-router-dom";

const linkBase =
  "block rounded-lg px-4 py-2 text-sm font-medium transition";
const linkActive =
  "bg-blue-600 text-white";
const linkPassive =
  "text-slate-700 hover:bg-slate-200";

export default function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r min-h-screen p-4">
      <div className="mb-6">
        <div className="text-lg font-semibold">Admin Panel</div>
        <div className="text-slate-500 text-xs">v1.0.0</div>
      </div>

      <nav className="space-y-1">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `${linkBase} ${isActive ? linkActive : linkPassive}`
          }
        >
          Dashboard
        </NavLink>

        <NavLink
          to="/devices"
          className={({ isActive }) =>
            `${linkBase} ${isActive ? linkActive : linkPassive}`
          }
        >
          Cihazlar
        </NavLink>

        <NavLink
          to="/employees"
          className={({ isActive }) =>
            `${linkBase} ${isActive ? linkActive : linkPassive}`
          }
        >
          Çalışanlar
        </NavLink>

        <NavLink
          to="/logs"
          className={({ isActive }) =>
            `${linkBase} ${isActive ? linkActive : linkPassive}`
          }
        >
          Operatör Logları
        </NavLink>

        <NavLink
          to="/equipment"
          className={({ isActive }) =>
            `${linkBase} ${isActive ? linkActive : linkPassive}`
          }
        >
          Ekipman (yakında)
        </NavLink>
      </nav>
    </aside>
  );
}
