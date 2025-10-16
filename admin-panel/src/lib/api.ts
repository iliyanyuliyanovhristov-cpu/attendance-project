// admin-panel/src/lib/api.ts

// .env.local içindeki VITE_API_URL'i oku ve sağlamlaştır
const RAW = (import.meta.env.VITE_API_URL as string) || "http://localhost:4000";
// sonda / olmasın, başında protokol olsun
const BASE = RAW.replace(/\/+$/, "");
if (!/^https?:\/\//i.test(BASE)) {
  console.warn(
    `[api] VITE_API_URL değeri protokolsüz görünüyor: "${RAW}". ` +
      `Lütfen ".env.local" içinde "http://localhost:4000" gibi yazın.`
  );
}

export async function apiGet<T = any>(path: string): Promise<T> {
  const url = buildUrl(path);
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
  });
  return handle(res, url);
}

// Token yardımcıları
export function getToken() {
  return localStorage.getItem("token") || "";
}
export function setToken(token: string) {
  localStorage.setItem("token", token);
}
export function clearToken() {
  localStorage.removeItem("token");
}

type Options = RequestInit & { auth?: boolean };

export default async function request<T = any>(
  path: string,
  opts: Options = {}
): Promise<T> {
  const url = buildUrl(path);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string> | undefined),
  };

  if (opts.auth) {
    const t = getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }

  const res = await fetch(url, { ...opts, headers });
  return handle(res, url);
}

// --- iç yardımcılar ---

function buildUrl(path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${BASE}${p}`;
}

async function handle(res: Response, url: string) {
  // metin olarak al, JSON ise parse et; HTML 404 gelirse anlaşılır hata ver
  const txt = await res.text();
  let data: any = null;

  try {
    data = txt ? JSON.parse(txt) : null;
  } catch {
    // JSON değilse (genelde HTML 404) açık mesajla dönelim
    const snippet = txt.slice(0, 120).replace(/\s+/g, " ").trim();
    const msg = `${res.status} ${res.statusText} :: ${snippet || "(boş gövde)"}\nURL: ${url}`;
    throw new Error(msg);
  }

  if (!res.ok) {
    const msg = `${res.status} ${res.statusText} - ${JSON.stringify(data)}`;
    throw new Error(msg);
  }
  return data;
}
