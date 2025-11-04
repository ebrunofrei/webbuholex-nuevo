// src/services/_newsCore.js
// ============================================================
// 🦉 Núcleo de News (helpers + BASE segura)
// - En PROD: usa VITE_API_BASE_URL (si NO es localhost) o "/api"
// - En DEV: siempre "/api" (proxy de Vite)
// - Incluye HEALTH_URL, toQS, joinUrl, proxifyMedia y fetchJSON c/timeout
// ============================================================

function normalizeBase(b) {
  if (!b) return "";
  let base = String(b).trim().replace(/\/+$/, "");
  // evita /api duplicado
  base = base.replace(/\/api(?:\/api)+$/i, "/api");
  return base;
}
function isLocal(u = "") {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?/i.test(String(u));
}

const RAW_ENV =
  import.meta?.env?.VITE_API_BASE_URL ||
  import.meta?.env?.VITE_NEWS_API_BASE_URL ||
  "";

const ENV_BASE = normalizeBase(RAW_ENV);

// PROD: ENV si NO es localhost; si no, relativo "/api".
// DEV: siempre "/api" (usa proxy de Vite).
export const API_BASE = import.meta.env.PROD
  ? (ENV_BASE && !isLocal(ENV_BASE) ? ENV_BASE : "/api")
  : "/api";

export const HEALTH_URL = `${API_BASE.replace(/\/+$/, "")}/health`;
export const FETCH_TIMEOUT_MS = 12000;

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function toQS(obj = {}) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) {
      if (v.length) p.set(k, v.join(","));
      continue;
    }
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

/**
 * Para proxear imágenes externas vía tu backend (si tienes /api/media?url=)
 * Si ya viene absoluta http/https → construye /api/media?url=...
 * Si no, retorna tal cual
 */
export function proxifyMedia(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) {
    const base = String(API_BASE || "").replace(/\/+$/, "");
    return `${base}/media?url=${encodeURIComponent(url)}`;
  }
  return url;
}

/**
 * fetchJSON con timeout, abort y manejo de errores legibles
 */
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
    try {
      return await res.json();
    } catch {
      return {};
    }
  } finally {
    clearTimeout(id);
  }
}
