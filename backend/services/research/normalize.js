// backend/services/research/normalize.js
function hostname(u) {
  try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; }
}

export function normalizeHit(hit) {
  if (!hit?.url || !hit?.title) return null;
  return {
    title: String(hit.title).trim(),
    url: hit.url,
    snippet: (hit.snippet || "").trim(),
    source: hostname(hit.url),
    date: hit.date || null,
  };
}

export function filterAllowedDomains(list, allowed) {
  if (!allowed?.length) return list;
  return list.filter(x => allowed.some(dom => x.source.endsWith(dom)));
}
