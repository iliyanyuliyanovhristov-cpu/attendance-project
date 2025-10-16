// src/pages/EquipmentLogs.tsx
import React, { useEffect, useMemo, useState } from "react";
import request from "../lib/api";

type Device = {
  id: string;
  companyId: string;
  tabletNumber: string;
};

type EquipmentLog = {
  id: string;
  companyId: string;
  deviceId?: string | null;
  recordedBy?: string | null; // ör: "tablet-T1"
  key: string;                // ör: "buzdolabi_set_sicaklik"
  value: string;              // ör: "3"
  unit?: string | null;       // ör: "°C"
  createdAt: string;          // ISO
};

function fmt(dt?: string | null) {
  if (!dt) return "-";
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return dt;
  }
}

export default function EquipmentLogsPage() {
  const [companyId, setCompanyId] = useState<string>("");
  const [rows, setRows] = useState<EquipmentLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // filtreler
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    const s = p.toString();
    return s ? `?${s}` : "";
  }, [from, to]);

  async function load() {
    try {
      setLoading(true);
      setErr(null);

      // 1) Ahmet’in cihazlarından companyId belirle
      const myDevs = await request<Device[]>("/api/admin/my-devices", { auth: true });
      if (!myDevs.length) {
        setRows([]);
        setErr("Bu kullanıcıya atanmış cihaz yok. (Önce cihaz sahibi atayın)");
        return;
      }
      const cid = myDevs[0].companyId;
      setCompanyId(cid);

      // 2) Logları çek
      // Back-end’de route adını şöyle varsayıyorum:
      // GET /api/companies/:companyId/equipment-logs?from=YYYY-MM-DD&to=YYYY-MM-DD
      const data = await request<EquipmentLog[]>(
        `/api/companies/${cid}/equipment-logs${qs}`,
        { auth: true }
      );
      setRows(data);
    } catch (e: any) {
      setErr(e.message || "Failed to load");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* ilk yük */ }, []);
  useEffect(() => { /* filtre değişince yükle */ if (companyId) load(); }, [qs]);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Equipment Logs</h1>

      <p className="text-slate-600 mb-4">
        Manuel ekipman kayıtlarını (ör: buzdolabı/klima değerleri) burada görürsün.
        {companyId && <span className="ml-2 text-xs">companyId: {companyId}</span>}
      </p>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-sm text-slate-600 mb-1">From (YYYY-MM-DD)</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">To (YYYY-MM-DD)</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>
        <button
          onClick={load}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-500"
        >
          Reload
        </button>
        {loading && <span className="text-sm text-slate-500">Loading…</span>}
        {err && <span className="text-sm text-red-600">{err}</span>}
      </div>

      <div className="overflow-x-auto bg-white rounded shadow">
        <table className="min-w-[900px] w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-4 py-2">Time</th>
              <th className="text-left px-4 py-2">Key</th>
              <th className="text-left px-4 py-2">Value</th>
              <th className="text-left px-4 py-2">Unit</th>
              <th className="text-left px-4 py-2">Recorded By</th>
              <th className="text-left px-4 py-2">Device</th>
              <th className="text-left px-4 py-2">ID</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No logs found.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2">{fmt(r.createdAt)}</td>
                <td className="px-4 py-2">{r.key}</td>
                <td className="px-4 py-2">{r.value}</td>
                <td className="px-4 py-2">{r.unit ?? "-"}</td>
                <td className="px-4 py-2">{r.recordedBy ?? "-"}</td>
                <td className="px-4 py-2">{r.deviceId ?? "-"}</td>
                <td className="px-4 py-2 text-xs text-slate-500">{r.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
