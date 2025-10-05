const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

/**
 * Convierte un path relativo o URL absoluta en una URL absoluta segura
 * @param {string} pathOrUrl
 * @returns {string}
 */
export function asAbsoluteUrl(pathOrUrl) {
  if (!pathOrUrl) return "";

  // Si ya es http(s), se devuelve tal cual
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;

  // Normalizar slash inicial
  const normalized = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${API_BASE}${normalized.replace(/^\/api/, "")}`;
}
