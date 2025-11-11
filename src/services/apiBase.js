// src/services/apiBase.js
// ============================================================
// 🦉 BúhoLex | Fuente única y blindada de API base (frontend)
// ============================================================

/* ------------------------- Entorno y helpers base ------------------------- */
const G = typeof globalThis !== "undefined" ? globalThis : {};
const IS_BROWSER = typeof window !== "undefined" && !!window.location;
const IS_SSR = !!(import.meta?.env?.SSR);
const HAS_PROCESS = typeof process !== "undefined" && !!process.env;
const NODE_ENV = (
  import.meta?.env?.MODE ||
  (HAS_PROCESS ? process.env.NODE_ENV : "") ||
  "production"
).toLowerCase();

function safeOrigin() {
  if (IS_BROWSER && window.location?.origin) return window.location.origin;       // Browser
  if (typeof self !== "undefined" && self.location?.origin) return self.location.origin; // SW/WebWorker
  return ""; // SSR
}

function normalizeBase(input) {
  if (!input) return "";
  let base = String(input).trim();

  // Protocol-relative ("//host") ⇒ añade protocolo
  if (/^\/\//.test(base)) {
    const proto = (IS_BROWSER ? window.location?.protocol : "https:") || "https:";
    base = `${proto}${base}`;
  }

  base = base.replace(/\/+$/, "");                // quita barras finales
  base = base.replace(/\/api(?:\/api)+$/i, "/api"); // compacta /api/api
  return base;
}

function isLocalHostLike(url) {
  try {
    const u = new URL(url);
    return u.hostname === "localhost" || u.hostname === "127.0.0.1" || u.hostname === "[::1]";
  } catch {
    return false;
  }
}

function isProdOrigin() {
  const o = safeOrigin();
  return !!o && !/localhost|127\.0\.0\.1|\[::1\]/i.test(o);
}

/* -------------------------- Resolución de la base ------------------------- */
// 1) Env (build/runtime) — soporta varias claves
const fromEnv =
  normalizeBase(import.meta?.env?.VITE_API_BASE_URL) ||
  normalizeBase(import.meta?.env?.VITE_API_BASE) ||
  normalizeBase(HAS_PROCESS ? process.env.API_BASE_URL : "");

// 2) Global override (window.__API_BASE__)
const fromGlobal = normalizeBase(G.__API_BASE__);

// 3) <meta name="api-base" content="https://api.buholex.com">
let fromMeta = "";
try {
  if (IS_BROWSER) {
    const c = document.querySelector('meta[name="api-base"]')?.content;
    fromMeta = normalizeBase(c || "");
  }
} catch { /* noop */ }

// 4) Fallback coherente
const origin = safeOrigin();
const fallback = origin
  ? normalizeBase(`${origin}/api`) // rewrites del host actual
  : normalizeBase(NODE_ENV === "development" ? "http://127.0.0.1:3000/api" : "/api");

// Prioridad final
export const API_BASE = normalizeBase(fromEnv || fromGlobal || fromMeta || fallback);

/* ------------------------------- Utilidades ------------------------------- */
/** Une la base con un path, evitando /api/api y barras dobles. */
export function joinApi(path = "") {
  const base = String(API_BASE || "").replace(/\/+$/, "");
  let p = String(path || "").trim();

  // URL absoluta → respeta
  if (/^https?:\/\//i.test(p)) return p;

  if (!p.startsWith("/")) p = `/${p}`;
  if (/\/api$/i.test(base) && /^\/api(\/|$)/i.test(p)) {
    p = p.replace(/^\/api/i, "") || "/";
  }
  return `${base}${p}`.replace(/([^:]\/)\/+/g, "$1");
}

/** fetch que acepta path relativo (lo pasa por joinApi). */
export function apiFetch(input, init) {
  const url = typeof input === "string" ? joinApi(input) : input;
  return fetch(url, init);
}

// Alias conveniente
export const buildUrl = joinApi;

/* --------------------------- Aviso (una sola vez) ------------------------- */
let __warned = false;
if (!__warned && isProdOrigin() && isLocalHostLike(API_BASE)) {
  __warned = true;
  // eslint-disable-next-line no-console
  console.warn("[BúhoLex] API_BASE apunta a loopback en producción:", API_BASE);
}

// 🚫 Sin export default (obligamos imports nombrados)
