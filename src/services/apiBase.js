// src/services/apiBase.js
// ============================================================
// 🦉 BúhoLex | Fuente única de base de API (frontend)
// - Lee VITE_API_BASE_URL cuando existe
// - Fallback: origin + "/api" (browser) o "http://localhost:3000/api" (SSR/dev)
// - joinApi(): compone rutas sin duplicar "/api" ni barras
// ============================================================

const IS_BROWSER = typeof window !== "undefined" && !!window.location;

function normalizeBase(b) {
  if (!b) return "";
  let base = String(b).trim();

  // Si viene con protocolo omitido ("//host"), añade el del documento.
  if (/^\/\//.test(base) && IS_BROWSER) {
    base = `${window.location.protocol}${base}`;
  }

  // Quita barras finales
  base = base.replace(/\/+$/, "");

  // Compacta ".../api/api" al final por si alguien configuró mal el env
  base = base.replace(/\/api(?:\/api)+$/i, "/api");

  return base;
}

const fromEnv = normalizeBase(import.meta.env?.VITE_API_BASE_URL || "");

// Fallbacks coherentes para browser/SSR
const fallback = IS_BROWSER
  ? `${window.location.origin.replace(/\/+$/, "")}/api`
  : "http://localhost:3000/api";

export const API_BASE = normalizeBase(fromEnv || fallback);

/**
 * Une la base con un path, evitando "/api/api" y barras dobles.
 * Acepta "voz", "/voz", "api/voz" o "/api/voz" sin romper.
 */
export function joinApi(path = "") {
  const base = String(API_BASE || "").replace(/\/+$/, "");
  let p = String(path || "").trim();

  // Normaliza el path a partir de "/"
  if (!p.startsWith("/")) p = `/${p}`;

  // Si la base termina en "/api" y el path empieza con "/api", evita duplicarlo
  if (/\/api$/i.test(base) && /^\/api(\/|$)/i.test(p)) {
    p = p.replace(/^\/api/i, "") || "/";
  }

  // Compacta barras duplicadas
  return `${base}${p}`.replace(/([^:]\/)\/+/g, "$1");
}
