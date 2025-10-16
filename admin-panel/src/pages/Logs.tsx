// src/pages/Logs.tsx
import React, { useMemo, useState } from "react";
import request from "../lib/api";

type LogItem = {
  id: string;
  // Sunucu farklı adlarla döndürebilir, hepsini opsiyonel tutuyoruz
  timestamp?: string | number;
  createdAt?: string | number;
  created_at?: string | number;
  action: "IN" | "OUT";
  source: string | null;
  employee: { firstName: string; lastName: string; id: string };
};

function yyyymmdd(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Zamanı sağlam biçimde biçimlendir
function formatDate(raw: unknown): string {
  if (raw === null || raw === undefined) return "-";

  // Sayı (epoch ms) ise
  if (typeof raw === "number") {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? "-" : d.toLocaleString("tr-TR");
  }

  // String ise normalleştirerek dene
  if (typeof raw === "string") {
    // ISO'ya yakın ama time zone yoksa sonuna Z ekle
    const norm =
      /T\d{2}:\d{2}/.test(raw) && !/[Z+\-]\d{2}/.test(raw) ? raw + "Z" : raw;

    let d = new Date(norm);
    if (!isNaN(d.getTime())) return d.toLocaleString("tr-TR");

    // "YYYY-MM-DD HH:mm:ss" gibi boşluklu formatları dene
    d = new Date(raw.replace(" ", "T"));
    if (!isNaN(d.getTime())) return d.toLocaleString("tr-TR");

    // Artık ham değeri göster
    return raw;
  }

  // Diğer tipler
  try {
    const d = new Date((raw as any).toString?.() ?? String(raw));
    if (!isNaN(d.getTime())) return d.toLocaleString("tr-TR");
  } catch {}
  return "-";
}

export default function LogsPage() {
  const today = useMemo(() => new Date(), []);
  const sevenAgo = useMemo(
    () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    []
  );

  const [from, setFrom] = useState(yyyymmdd(sevenAgo));
  const [to, setTo] = useState(yyyymmdd(today));
  const [employeeId, setEmployeeId] = useState("");

  const [items, setItems] = useState<LogItem[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    try {
      setLoading(true);
      setErr(null);

      const companyId = localStorage.getItem("companyId");
      if (!companyId) {
        alert("companyId bulunamadı (localStorage.companyId).");
        setLoading(false);
        return;
      }

      const qs = new URLSearchParams();
      qs.set("from", from);
      qs.set("to", to);
      if (employeeId.trim()) qs.set("employeeId", employeeId.trim());

      // Sunucudaki gerçek endpoint:
      const data = await request<LogItem[]>(
        `/api/companies/${companyId}/logs?${qs.toString()}`,
        { auth: true }
      );

      setItems(data);
    } catch (e: any) {
      setErr(e.message || "Failed to load");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">
        Operatör Giriş-Çıkış Kayıtları
      </h2>

      <div className="flex gap-3 items-end mb-4">
        <div>
          <label className="lbl">Başlangıç</label>
          <input
            className="inp"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="lbl">Bitiş</label>
          <input
            className="inp"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <label className="lbl">Personel (opsiyonel)</label>
          <input
            className="inp"
            placeholder="employeeId"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
          />
        </div>
        <button className="btn" onClick={load} disabled={loading}>
          Listeyi Getir
        </button>
        {err && <span className="text-red-600">{err}</span>}
      </div>

      <div className="card">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Zaman</th>
              <th className="th">Ad</th>
              <th className="th">Soyad</th>
              <th className="th">Aksiyon</th>
              <th className="th">Kaynak</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td className="td text-center" colSpan={5}>
                  Kayıt bulunamadı.
                </td>
              </tr>
            ) : (
              items.map((l) => {
                // Birden fazla olasılığı sırayla dene
                const raw = l.timestamp ?? l.createdAt ?? l.created_at ?? null;
                const shown = formatDate(raw);

                return (
                  <tr key={l.id}>
                    {/* Ham değer debug için title’da */}
                    <td className="td" title={raw ? String(raw) : ""}>
                      {shown}
                    </td>
                    <td className="td">{l.employee.firstName}</td>
                    <td className="td">{l.employee.lastName}</td>
                    <td className="td">{l.action}</td>
                    <td className="td">{l.source ?? "-"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
