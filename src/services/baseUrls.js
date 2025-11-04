// === Punto único de URLs base (frontend) ===

// ¿es localhost?
function isLocal(u = "") {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?/i.test(String(u));
}

// Normaliza base de API agregando /api si falta (para el backend de noticias)
function normApi(b = "") {
  const raw = String(b).trim().replace(/\/+$/, "");
  if (!raw) return "";
  let base = raw;
  if (!/\/api$/i.test(base)) base += "/api";
  // evita /api/api duplicado
  return base.replace(/\/api(?:\/api)+$/i, "/api");
}

// Normaliza base genérica (solo quita slashes finales)
function normBase(b = "") {
  return String(b).trim().replace(/\/+$/, "");
}

// Vite envs
const RAW_NEWS = import.meta?.env?.VITE_NEWS_API_BASE_URL || import.meta?.env?.VITE_API_BASE_URL || "";
const RAW_CHAT = import.meta?.env?.VITE_CHAT_API_BASE_URL || "";

/* ============================================================
 * B A S E S
 * ------------------------------------------------------------
 * NEWS_API_BASE → API pública de noticias (por rewrites suele ser "/api")
 * CHAT_BASE     → API del backend principal (chat, voz, etc.) (por rewrites "/chat-api")
 * En PROD jamás usar localhost; si no hay env válido, usar rutas relativas.
 * En DEV también relativas para que Vite proxy funcione.
 * ============================================================ */
export const NEWS_API_BASE = import.meta.env.PROD
  ? (normApi(RAW_NEWS) && !isLocal(RAW_NEWS) ? normApi(RAW_NEWS) : "/api")
  : "/api";

export const CHAT_BASE = import.meta.env.PROD
  ? (!isLocal(RAW_CHAT) && RAW_CHAT ? normBase(RAW_CHAT) : "/chat-api")
  : "/chat-api";

/* ============================================================
 * E N D P O I N T S
 * ------------------------------------------------------------
 * Separar HEALTH por servicio para diagnósticos claros.
 * OJO: si tu proxy de noticias expone /api/health en Railway,
 * crea el rewrite: "/api/news/health" -> "<proxy>/api/health"
 * ============================================================ */

// Noticias
export const NOTICIAS_URL        = `${NEWS_API_BASE}/noticias`;   // lista principal
export const NOTICIAS_FALLBACK_URL = `${NEWS_API_BASE}/news`;     // si el proxy usa /news
export const NEWS_HEALTH         = `${NEWS_API_BASE}/news/health`;

// Chat
export const CHAT_HEALTH         = `${CHAT_BASE}/health`;

// Voz (usa el mismo backend del chat → ruteamos por /chat-api)
export const VOZ_BASE            = `${CHAT_BASE}/voz`;
export const VOZ_HEALTH          = `${VOZ_BASE}/health`;
