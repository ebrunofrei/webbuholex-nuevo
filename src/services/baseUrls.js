// === Punto único de URLs base (frontend) ===
function isLocal(u = "") { return /^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?/i.test(u); }
function normApi(b = "") {
  const raw = String(b).trim().replace(/\/+$/, "");
  if (!raw) return "";
  let base = raw;
  if (!/\/api$/i.test(base)) base += "/api";
  return base.replace(/\/api(?:\/api)+$/i, "/api");
}

// Vite envs
const RAW_NEWS = import.meta?.env?.VITE_NEWS_API_BASE_URL || import.meta?.env?.VITE_API_BASE_URL || "";
const RAW_CHAT = import.meta?.env?.VITE_CHAT_API_BASE_URL || "";

// En PROD nunca localhost; si no hay env válido, usar rutas relativas (rewrites Vercel)
export const API_BASE  = import.meta.env.PROD ? (normApi(RAW_NEWS) && !isLocal(RAW_NEWS) ? normApi(RAW_NEWS) : "/api") : "/api";
export const CHAT_BASE = import.meta.env.PROD ? (!isLocal(RAW_CHAT) && RAW_CHAT ? RAW_CHAT.replace(/\/+$/,"") : "/chat-api") : "/chat-api";

// Endpoints comunes
export const HEALTH_URL    = `${API_BASE}/health`;
export const VOZ_BASE      = `${API_BASE}/voz`;
export const VOZ_HEALTH    = `${VOZ_BASE}/health`;
export const NOTICIAS_URL  = `${API_BASE}/noticias`; // base para listas
