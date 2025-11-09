// src/services/apiBase.js
/* ============================================================
 * 🦉 BúhoLex | API Base (frontend)
 * - usa VITE_NEWS_API_BASE_URL si existe
 * - si no, origin + /api (browser)
 * - en SSR/dev: 127.0.0.1:3000/api
 * - evita duplicar /api
 * ============================================================ */
const isBrowser = typeof window !== "undefined";

function normalizeApiBase(input) {
  const raw = (input || "").trim().replace(/\/+$/, "");
  if (!raw) return "";
  let base = raw;
  if (!/\/api$/i.test(base)) base += "/api";
  return base.replace(/\/api(?:\/api)+$/i, "/api");
}

const DEFAULT_API = isBrowser
  ? `${window.location.origin.replace(/\/$/, "")}/api`
  : "http://127.0.0.1:3000/api";

export const API_BASE =
  normalizeApiBase(import.meta?.env?.VITE_NEWS_API_BASE_URL || "") || DEFAULT_API;

  // 🧩 Compatibilidad con código antiguo (joinApi)
export function joinApi(endpoint = "") {
  const clean = String(endpoint || "").replace(/^\/+/, "");
  return `${API_BASE.replace(/\/$/, "")}/${clean}`;
}

export default API_BASE;

