// admin-panel/src/pages/Employees.tsx
import React, { useEffect, useState } from "react";
import request from "../lib/api";

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  active: boolean;
};

export default function EmployeesPage() {
  const [items, setItems] = useState<Employee[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    try {
      setLoading(true);
      setErr(null);
      const data = await request<Employee[]>("/api/admin/my-employees", { auth: true });
      setItems(data);
    } catch (e: any) {
      setErr(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Employees</h1>
      <button className="btn btn-primary" onClick={load} disabled={loading}>
        Reload
      </button>
      {err && <div className="text-red-600 mt-3">{err}</div>}

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full bg-white shadow rounded">
          <thead>
            <tr className="text-left">
              <th className="p-3">ID</th>
              <th className="p-3">First Name</th>
              <th className="p-3">Last Name</th>
              <th className="p-3">Active</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td className="p-3" colSpan={4}>No employees found.</td></tr>
            ) : items.map(e => (
              <tr key={e.id} className="border-t">
                <td className="p-3">{e.id}</td>
                <td className="p-3">{e.firstName}</td>
                <td className="p-3">{e.lastName}</td>
                <td className="p-3">{e.active ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
