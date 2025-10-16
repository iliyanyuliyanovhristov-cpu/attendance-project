// src/pages/AttendanceLogs.tsx
import React, { useEffect, useMemo, useState } from "react";
import request from "../lib/api";

type Device = {
  id: string;
  companyId: string;
  tabletNumber: string;
};

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
};

type AttendanceLog = {
  id: string;
  companyId: string;
  employeeId: string;
  action: "IN" | "OUT";
  timestamp: string; // ISO
  recordedBy?: string | null;
  employee?: Employee;
};

function fmt(dt?: string | null) {
  if (!dt) return "-";
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return dt;
  }
}

export default function AttendanceLogsPage() {
  const [companyId, setCompanyId] = useState<string>("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [rows, setRows] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // filtreler
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [employeeId, setEmployeeId] = useState<string>("");

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (employeeId) p.set("employeeId", employeeId);
    const s = p.toString();
    return s ? `?${s}` : "";
  }, [from, to, employeeId]);

  async function bootstrap() {
    try {
      setLoading(true);
      setErr(null);

      // 1) Company ID’yi Ahmet’in cihazlarından alıyoruz
      const myDevs = await request<Device[]>("/api/admin/my-devices", { auth: true });
      if (!myDevs.length) {
        setErr("Bu kullanıcıya atanmış cihaz yok (önce cihaz sahibi atayın).");
        return;
      }
      const cid = myDevs[0].companyId;
      setCompanyId(cid);

      // 2) Çalışan listesini çek
      const emps = await request<Employee[]>(`/api/companies/${cid}/employees`);
      setEmployees(emps);
    } catch (e: any) {
      setErr(e.message || "Init failed");
    } finally {
      setLoading(false);
    }
  }

  async function loadLogs() {
    if (!companyId) return;
    try {
      setLoading(true);
      setErr(null);

      const data = await request<AttendanceLog[]>(
        `/api/companies/${companyId}/logs${qs}`,
        { auth: true }
      );
      setRows(data);
    } catch (e: any) {
      setErr(e.message || "Failed to load logs");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  // CSV indir (Auth header ile)
  async function downloadCsv() {
    if (!companyId) return;
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(
        `${import.meta.env.VITE_API_URL ?? "http://localhost:4000"}/api/companies/${companyId}/logs.csv${qs}`,
        {
          headers: {
            "Authorization": token ? `Bearer ${token}` : "",
          },
        }
      );
      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance_logs_${companyId}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setErr(`CSV indirme hatası: ${e.message || e}`);
    }
  }

  useEffect(() => { bootstrap(); }, []);
  useEffect(() => { if (companyId) loadLogs(); }, [companyId]); // ilk yük
  useEffect(() => { if (companyId) loadLogs(); }, [qs]);        // filtreler değişince

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Attendance Logs</h1>

      <p className="text-slate-600 mb-4">
        Operatör giriş/çıkış kayıtları. {companyId && (
          <span className="ml-2 text-xs">companyId: {companyId}</span>
        )}
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
        <div>
          <label className="block text-sm text-slate-600 mb-1">Employee</label>
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="border rounded px-3 py-2 min-w-[220px]"
          >
            <option value="">— All —</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.firstName} {e.lastName} ({e.id})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={loadLogs}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-500"
        >
          Reload
        </button>

        <button
          onClick={downloadCsv}
          className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-500"
        >
          Export CSV
        </button>

        {loading && <span className="text-sm text-slate-500">Loading…</span>}
        {err && <span className="text-sm text-red-600">{err}</span>}
      </div>

      <div className="overflow-x-auto bg-white rounded shadow">
        <table className="min-w-[900px] w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-4 py-2">Time</th>
              <th className="text-left px-4 py-2">Employee</th>
              <th className="text-left px-4 py-2">Action</th>
              <th className="text-left px-4 py-2">Recorded By</th>
              <th className="text-left px-4 py-2">Log ID</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No logs found.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2">{fmt(r.timestamp)}</td>
                <td className="px-4 py-2">
                  {r.employee
                    ? `${r.employee.firstName} ${r.employee.lastName}`
                    : r.employeeId}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={
                      r.action === "IN"
                        ? "px-2 py-1 rounded bg-emerald-100 text-emerald-700 text-xs font-semibold"
                        : "px-2 py-1 rounded bg-rose-100 text-rose-700 text-xs font-semibold"
                    }
                  >
                    {r.action}
                  </span>
                </td>
                <td className="px-4 py-2">{r.recordedBy ?? "-"}</td>
                <td className="px-4 py-2 text-xs text-slate-500">{r.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
