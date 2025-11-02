import { REGISTRY, DEFAULTS } from "./newsProviders/index.js";
import { normalizeItem, filterByLang, filterByTopics, isCompleteBySummary } from "./newsProviders/_helpers.js";

export async function obtenerNoticias({ 
  tipo = "general", page = 1, limit = 10, q = "", lang = "es", 
  especialidad = "todas", providers = [], completos = 0 
}) {
  const keys = (Array.isArray(providers) && providers.length)
    ? providers
    : DEFAULTS[tipo] || DEFAULTS.general;

  // Ejecuta en paralelo y tolera errores
  const settled = await Promise.allSettled(
    keys
      .filter(k => REGISTRY[k])
      .map(k => REGISTRY[k].fetchNoticias({ q, page, limit, lang, especialidad }))
  );

  // Junta y normaliza
  let items = [];
  for (const r of settled) {
    if (r.status === "fulfilled" && Array.isArray(r.value)) {
      items.push(...r.value.map(normalizeItem));
    }
  }

  // Filtros
  if (lang && lang !== "all") items = filterByLang(items, lang);
  if (q && q.trim()) {
    const topics = q.split(",").map(s => s.trim()).filter(Boolean);
    items = filterByTopics(items, topics);
  }
  if (completos) {
    items = items.filter(n => isCompleteBySummary(n));
  }

  // Orden por fecha desc y luego por multimedia
  const mediaScore = (n) => (n.video ? 2 : (n.imagen ? 1 : 0));
  items.sort((a, b) => {
    const mf = mediaScore(b) - mediaScore(a);
    if (mf) return mf;
    const db = new Date(b.fecha || 0).getTime();
    const da = new Date(a.fecha || 0).getTime();
    return db - da;
  });

  // PaginaciÃ³n (simple en memoria)
  const start = (page - 1) * limit;
  const end = start + limit;
  const pageItems = items.slice(start, end);

  return {
    ok: true,
    items: pageItems,
    pagination: { page, limit, total: items.length, pages: Math.ceil(items.length / limit) || 0, nextPage: end < items.length ? page + 1 : null },
    filtros: { tipo, especialidad, q, lang, providers: keys },
  };
}
