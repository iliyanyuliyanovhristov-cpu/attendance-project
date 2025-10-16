import { useEffect, useMemo, useState } from "react";
import request, { getToken } from "../lib/api";

type Employee = { id: string; firstName: string; lastName: string };
type Device = { id: string; tabletNumber: string; lastSeen?: string };
type Company = { id: string; name: string };

type LogRow = {
  id: string;
  employeeId: string;
  companyId: string;
  action: "IN" | "OUT";
  timestamp: string;
  recordedBy: string;
  employee: { firstName: string; lastName: string };
};

export default function DashboardPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState<string>("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);

  // today range
  const todayFrom = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);
  const todayTo = todayFrom;

  useEffect(() => {
    (async () => {
      // companies
      const list = await request<Company[]>("/api/companies", { auth: true });
      setCompanies(list);
      if (list.length && !companyId) setCompanyId(list[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      setLoading(true);
      try {
        // employees
        const emps = await request<Employee[]>(
          `/api/companies/${companyId}/employees`,
          { auth: true }
        );
        setEmployees(emps);

        // last 1 day logs (limit 200)
        const lgs = await request<LogRow[]>(
          `/api/companies/${companyId}/logs?from=${todayFrom}&to=${todayTo}&limit=200&skip=0`,
          { auth: true }
        );
        setLogs(lgs);

        // devices (mevcut endpoint: kendi cihazlarım)
        // super admin giriş yaptıysa tüm cihazları listeleyen bir endpoint yoksa
        // en azından "my-devices" ile görünür. COMPANY_ADMIN için zaten yeterli.
        try {
          const my = await request<Device[]>("/api/admin/my-devices", {
            auth: true,
          });
          setDevices(my);
        } catch {
          setDevices([]);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [companyId, todayFrom, todayTo]);

  // KPI’lar
  const totalEmps = employees.length;
  const totalDevices = devices.length;

  const todayIn = logs.filter((l) => l.action === "IN").length;
  const todayOut = logs.filter((l) => l.action === "OUT").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-3">
          <select
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            className="border px-3 py-2 rounded-md"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-6 bg-white rounded-xl shadow border">Yükleniyor…</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Kpi title="Toplam Operatör" value={totalEmps} />
            <Kpi title="Tablet Sayısı" value={totalDevices} />
            <Kpi title="Bugün GİRİŞ" value={todayIn} />
            <Kpi title="Bugün ÇIKIŞ" value={todayOut} />
          </div>

          {/* Son hareketler */}
          <div className="bg-white rounded-xl shadow border">
            <div className="p-4 border-b">
              <h2 className="font-semibold">Bugünün Son Hareketleri</h2>
            </div>
            <div className="p-4">
              {logs.length === 0 ? (
                <div className="text-sm text-slate-500">
                  Kayıt bulunamadı (bugün).
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-left text-slate-500">
                    <tr>
                      <th className="py-2">Operatör</th>
                      <th className="py-2">İşlem</th>
                      <th className="py-2">Saat</th>
                      <th className="py-2">Tablet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.slice(0, 10).map((l) => (
                      <tr key={l.id} className="border-t">
                        <td className="py-2">
                          {l.employee.firstName} {l.employee.lastName}
                        </td>
                        <td className="py-2">{l.action}</td>
                        <td className="py-2">
                          {new Date(l.timestamp).toLocaleString()}
                        </td>
                        <td className="py-2">{l.recordedBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ title, value }: { title: string; value: number }) {
  return (
    <div className="bg-white rounded-xl shadow border p-4">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}
