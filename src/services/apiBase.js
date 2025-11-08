// src/services/apiBase.js
// ============================================================
// 🦉 BúhoLex | Fuente única y blindada de API base (frontend)
// - Prioriza VITE_API_BASE_URL / API_BASE_URL / <meta name="api-base">
// - Soporta Browser, Service Worker/WebWorker y SSR (Vite SSR)
// - Fallback coherente: origin + "/api" (si hay origin) o 127.0.0.1 en dev
// - joinApi(): compone rutas sin duplicar "/api" ni barras
// - apiFetch(): wrapper que acepta path relativo y aplica API_BASE
// - Warn: avisa si en prod se detecta "localhost"/"127.0.0.1"
// ============================================================

/* ------------------------- Entorno y helpers base ------------------------- */
const G = typeof globalThis !== "undefined" ? globalThis : {};
const IS_BROWSER = typeof window !== "undefined" && !!window.location;
const IS_SSR = !!(import.meta?.env?.SSR);
const NODE_ENV = (import.meta?.env?.MODE || process?.env?.NODE_ENV || "production").toLowerCase();

function safeOrigin() {
  // Browser
  if (IS_BROWSER && window.location?.origin) return window.location.origin;

  // SW / WebWorker
  if (typeof self !== "undefined" && self.location?.origin) return self.location.origin;

  // SSR: no hay origin real
  return "";
}

function normalizeBase(input) {
  if (!input) return "";
  let base = String(input).trim();

  // Protocol-relative ("//host") → añade protocolo si hay
  if (/^\/\//.test(base)) {
    const proto = (IS_BROWSER ? window.location?.protocol : "https:") || "https:";
    base = `${proto}${base}`;
  }

  // Quita barras finales
  base = base.replace(/\/+$/, "");

  // Compacta ".../api/api" al final por mala config
  base = base.replace(/\/api(?:\/api)+$/i, "/api");

  return base;
}

function isLocalHostLike(url) {
  try {
    const u = new URL(url);
    return (
      u.hostname === "localhost" ||
      u.hostname === "127.0.0.1" ||
      u.hostname === "[::1]"
    );
  } catch {
    return false;
  }
}

function isProdOrigin() {
  const o = safeOrigin();
  return !!o && !/localhost|127\.0\.0\.1|\[::1\]/i.test(o);
}

/* -------------------------- Resolución de la base ------------------------- */
// 1) Env (build/runtime)
const fromEnv =
  normalizeBase(import.meta?.env?.VITE_API_BASE_URL) ||
  normalizeBase(process?.env?.API_BASE_URL);

// 2) Global override (por si inyectas window.__API_BASE__ en index.html)
const fromGlobal = normalizeBase(G.__API_BASE__);

// 3) <meta name="api-base" content="https://api.buholex.com">
let fromMeta = "";
try {
  if (IS_BROWSER) {
    const c = document.querySelector('meta[name="api-base"]')?.content;
    fromMeta = normalizeBase(c || "");
  }
} catch {
  /* noop */
}

// 4) Fallback coherente
const origin = safeOrigin();
const fallback = origin
  ? normalizeBase(`${origin}/api`) // Browser / Worker con host real → usa rewrites
  : normalizeBase(
      // SSR/dev sin origin: usa 127.0.0.1 (no "localhost" para evitar resoluciones extrañas)
      NODE_ENV === "development" ? "http://127.0.0.1:3000/api" : "/api"
    );

// Prioridad final
export const API_BASE = normalizeBase(fromEnv || fromGlobal || fromMeta || fallback);

// Aviso de seguridad: si estamos en un host productivo pero la base apunta a loopback
if (isProdOrigin() && isLocalHostLike(API_BASE)) {
  // No lanzamos error para no romper; pero avisamos fuerte una sola vez.
  // eslint-disable-next-line no-console
  console.warn(
    "[BúhoLex] API_BASE apunta a localhost/127.0.0.1 en producción:",
    API_BASE
  );
}

/* ------------------------------- Utilidades ------------------------------- */
/**
 * Une la base con un path, evitando "/api/api" y barras dobles.
 * Acepta "voz", "/voz", "api/voz" o "/api/voz".
 */
export function joinApi(path = "") {
  const base = String(API_BASE || "").replace(/\/+$/, "");
  let p = String(path || "").trim();

  // Si ya es URL absoluta, respeta tal cual.
  if (/^https?:\/\//i.test(p)) return p;

  // Normaliza a partir de "/"
  if (!p.startsWith("/")) p = `/${p}`;

  // Si la base termina en "/api" y el path empieza con "/api", evita duplicado
  if (/\/api$/i.test(base) && /^\/api(\/|$)/i.test(p)) {
    p = p.replace(/^\/api/i, "") || "/";
  }

  // Compacta barras duplicadas (no toca el esquema "https://")
  return `${base}${p}`.replace(/([^:]\/)\/+/g, "$1");
}

/**
 * Wrapper de fetch que acepta path relativo (lo pasa por joinApi).
 * Si le das una URL absoluta, la usa sin tocarla.
 */
export function apiFetch(input, init) {
  const url = typeof input === "string" ? joinApi(input) : input;
  return fetch(url, init);
}

export default API_BASE;
