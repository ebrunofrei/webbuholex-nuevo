export function asAbsoluteUrl(pathOrUrl) {
  if (!pathOrUrl) return "";
  // Si ya es http(s), se devuelve tal cual
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  // Garantiza slash inicial
  const normalized = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${window.location.origin}${normalized}`;
}
