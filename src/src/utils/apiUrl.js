import { API_BASE } from "@/services/apiBase";
/**
 * Convierte un path relativo o URL absoluta en una URL absoluta segura
 * @param {string} pathOrUrl
 * @returns {string}
 */
export function asAbsoluteUrl(pathOrUrl) {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const normalized = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${API_BASE}${normalized.replace(/^\/api/, "")}`;
}
