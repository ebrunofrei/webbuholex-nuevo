// ============================================================
// 🦉 BúhoLex | newsApis (core frontend, sin ciclos)
// ============================================================
function normalizeBase(b) {
  if (!b) return "";
  let base = String(b).trim().replace(/\/+$/, "");
  base = base.replace(/\/api(?:\/api)+$/i, "/api");
  return base;
}

const fromEnv = (import.meta?.env?.VITE_API_BASE_URL && String(import.meta.env.VITE_API_BASE_URL)) || "";
const fromWindow = (typeof window !== "undefined" && window.location)
  ? `${window.location.origin.replace(/\/+$/, "")}/api` : "";
const DEFAULT_BASE = "http://localhost:3000/api";

export const API_BASE = normalizeBase(fromEnv || fromWindow || DEFAULT_BASE);
export const FETCH_TIMEOUT_MS = 12000;

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function toQS(obj = {}) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) { if (v.length) p.set(k, v.join(",")); continue; }
    p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function joinUrl(base, path) {
  const b = String(base || "").replace(/\/+$/, "");
  const p = String(path || "").replace(/^\/+/, "");
  return `${b}/${p}`;
}

export function proxifyMedia(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) {
    const base = String(API_BASE || "").replace(/\/+$/, "");
    return `${base}/media?url=${encodeURIComponent(url)}`;
  }
  return url;
}

export async function fetchJSON(url, { timeout = FETCH_TIMEOUT_MS, signal, headers } = {}) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(new Error("timeout")), timeout);
  try {
    const res = await fetch(url, {
      signal: signal || ctrl.signal,
      headers: { accept: "application/json", ...(headers || {}) },
    });
    if (res.status === 204) return {};
    if (res.status === 304) return { __notModified: true };
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      const err = new Error(`HTTP ${res.status} ${res.statusText}`);
      err.status = res.status;
      err.body = txt;
      throw err;
    }
    try { return await res.json(); } catch { return {}; }
  } finally {
    clearTimeout(id);
  }
}
