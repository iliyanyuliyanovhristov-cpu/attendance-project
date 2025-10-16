// admin-panel/src/pages/Devices.tsx
import React, { useEffect, useState } from "react";
import request from "../lib/api";

type Device = {
  id: string;
  companyId: string;
  tabletNumber: string;
  ownerUserId: string | null;
  lastSeen: string | null;
};

export default function DevicesPage() {
  const [items, setItems] = useState<Device[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    try {
      setLoading(true);
      setErr(null);
      const data = await request<Device[]>("/api/admin/my-devices", { auth: true });
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
      <h1 className="text-3xl font-bold mb-6">Devices</h1>
      <button className="btn btn-primary" onClick={load} disabled={loading}>
        Reload
      </button>
      {err && <div className="text-red-600 mt-3">{err}</div>}

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full bg-white shadow rounded">
          <thead>
            <tr className="text-left">
              <th className="p-3">Tablet</th>
              <th className="p-3">Device ID</th>
              <th className="p-3">Company ID</th>
              <th className="p-3">Owner User</th>
              <th className="p-3">Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td className="p-3" colSpan={5}>No devices found.</td></tr>
            ) : items.map(d => (
              <tr key={d.id} className="border-t">
                <td className="p-3">{d.tabletNumber}</td>
                <td className="p-3">{d.id}</td>
                <td className="p-3">{d.companyId}</td>
                <td className="p-3">{d.ownerUserId ?? "-"}</td>
                <td className="p-3">{d.lastSeen ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
