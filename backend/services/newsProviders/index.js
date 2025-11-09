// ============================================================
// 🦉 BúhoLex | News Providers Registry (scrapers/feeds)
// - Registro tolerante (default, named, default.fetchNoticias)
// - Exports: REGISTRY, DEFAULT_JURIDICAS, DEFAULT_GENERALES
// - Aggregator: collectFromProviders({ tipo, providers, q, lang, since, completos, limit, page })
// - Dedupe, filtro de idioma/temas, “completos”, orden fecha>multimedia
// ============================================================

import {
  filterByTopics,
  filterByLang,
  isCompleteEnough,
  normalizeItem,
} from "./_helpers.js";

// ---------- Providers (cargas robustas) ----------
import * as poderJudicialMod from "./poderJudicialProvider.js";
import * as tcMod            from "./tcProvider.js";
import * as gacetaMod        from "./gacetaJuridicaProvider.js";
import * as legisMod         from "./legisPeProvider.js";
import * as onuMod           from "./onuProvider.js";
import * as sunarpMod        from "./sunarpProvider.js";
import * as corteidhMod      from "./corteIDHProvider.js";
import * as cijMod           from "./cijProvider.js";
import * as jnjMod           from "./jnjProvider.js";
import * as elPeruanoMod     from "./elPeruanoProvider.js";

// Generales opcionales
import * as gnewsMod         from "./gnewsProvider.js";
import * as newsapiMod       from "./newsApiProvider.js";
import * as scienceMod       from "./scienceProvider.js";
import * as cyberMod         from "./cyberProvider.js";
// import * as tjueMod       from "./tjueProvider.js";

const DEBUG = String(process.env.DEBUG_NEWS || "").toLowerCase() === "true";

// ---------- helpers ----------
const fnOrNull = (f) => (typeof f === "function" ? f : null);

function resolveFetcher(mod, nameHints = []) {
  return (
    fnOrNull(mod.fetchNoticias) ||
    fnOrNull(mod.default?.fetchNoticias) ||
    fnOrNull(mod.default) ||
    nameHints.map((k) => fnOrNull(mod[k])).find(Boolean) ||
    null
  );
}

function adapt(mod, nameHints = []) {
  const f = resolveFetcher(mod, nameHints);
  if (!f) return null;
  return async function fetchNoticias(opts = {}) {
    const { q = "", lang = "es", since = null, limit, max } = opts || {};
    return await f({ q, lang, since, limit, max: max ?? limit });
  };
}

// ---------- Registro (claves en minúsculas) ----------
const poderjudicial  = adapt(poderJudicialMod, ["fetchPoderJudicial", "fetchNoticiasPJ", "fetchPJ"]);
const tc             = adapt(tcMod,            ["fetchTC"]);
const gacetajuridica = adapt(gacetaMod,        ["fetchGacetaJuridica"]);
const legispe        = adapt(legisMod,         ["fetchLegisPe"]);
const onu            = adapt(onuMod,           ["fetchOnuNoticias", "fetchONU"]);
const sunarp         = adapt(sunarpMod,        ["fetchSUNARP"]);
const corteidh       = adapt(corteidhMod,      ["fetchCorteIDH"]);
const cij            = adapt(cijMod,           ["fetchCIJ"]);
const jnj            = adapt(jnjMod,           ["fetchJNJ"]);
const elperuano      = adapt(elPeruanoMod,     ["fetchElPeruano"]);

const gnews          = adapt(gnewsMod,         ["fetchGNews", "fetchGnews"]);
const newsapi        = adapt(newsapiMod,       ["fetchNewsAPI", "fetchNewsApi"]);
const science        = adapt(scienceMod,       ["fetchScienceNews"]);
const cyber          = adapt(cyberMod,         ["fetchCyberNews"]);
// const tjue        = adapt(tjueMod,           ["fetchNoticias"]);

export const REGISTRY = {
  // Jurídicas
  poderjudicial,
  tc,
  gacetajuridica,
  legispe,
  onu,
  sunarp,
  corteidh,
  cij,
  jnj,

  // Generales
  elperuano,
  gnews,    // quedan registrados; se incluyen en defaults por flags
  newsapi,
  science,
  cyber,
  // tjue,

  // Aliases
  "poder judicial": poderjudicial,
  "tribunal constitucional": tc,
  "gaceta juridica": gacetajuridica,
  "legis.pe": legispe,
  "onu noticias": onu,
  "corte idh": corteidh,
  "el peruano": elperuano,
};

// Limpieza de nulos
for (const k of Object.keys(REGISTRY)) {
  if (!REGISTRY[k]) delete REGISTRY[k];
}

// ---------- Defaults controlados por flags ----------
const HAS_GNEWS   = !!(process.env.GNEWS_API_KEY || process.env.GNEWS_TOKEN);
const HAS_NEWSAPI = !!(process.env.NEWSAPI_KEY || process.env.NEWS_API_KEY);

// Nota: descomenta/ajusta si un proveedor está con 403 persistente
export const DEFAULT_JURIDICAS = [
  "poderjudicial",
  // "tc",
  // "gacetajuridica",
  // "corteidh",
  // "jnj",
  // "cij",
  // "sunarp",
  "elperuano", // útil como general estatal; suele responder estable
  "onu",
  // "tjue",
];

export const DEFAULT_GENERALES = [
  "elperuano",
  "science",
  // "cyber", // actívalo cuando afinemos el scraper
  ...(HAS_GNEWS   ? ["gnews"]   : []),
  ...(HAS_NEWSAPI ? ["newsapi"] : []),
];

// ---------- Topics whitelist ----------
const ALLOWED_TOPICS = [
  "jurisprudencia", "doctrina", "procesal", "reformas", "precedente", "casación",
  "tribunal constitucional", "constitucional", "civil", "penal", "laboral",
  "administrativo", "registral", "ambiental", "notarial", "penitenciario",
  "consumidor", "seguridad social", "internacional", "derechos humanos",
];

// Completo mínimo
const isAllowedComplete = (n, exigir) =>
  exigir ? isCompleteEnough(n?.resumen || n?.contenido || "", n?.bodyHtml) : true;

// Dedupe por URL/enlace/ID
function dedupe(items) {
  const seen = new Set();
  return items.filter((n) => {
    const k = (n?.url || n?.enlace || n?.link || n?.id || "").toLowerCase();
    if (!k) return true;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ---------- Aggregator ----------
export async function collectFromProviders({
  tipo = "juridica",
  providers, // array o CSV; si no, usa defaults por tipo
  q = "",
  lang = "es",
  topics = ALLOWED_TOPICS,
  completos = false,
  since = null,
  limit = 12,
  page = 1,
} = {}) {
  const list =
    Array.isArray(providers) && providers.length
      ? providers
      : (typeof providers === "string" && providers.trim()
          ? providers.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
          : (tipo === "general" ? DEFAULT_GENERALES : DEFAULT_JURIDICAS));

  if (DEBUG) console.log("[collect] tipo=%s providers=%o", tipo, list);

  const acts = list
    .map((key) => [key.toLowerCase(), REGISTRY[key.toLowerCase()]])
    .filter(([, f]) => typeof f === "function")
    .map(async ([key, fetchFn]) => {
      const started = Date.now();
      try {
        const raw = await fetchFn({
          q, lang, since,
          limit: Math.min(50, Math.max(12, Number(limit) * 2 || 24)),
        });
        const arr = Array.isArray(raw) ? raw : [];
        if (DEBUG) console.log(`[provider:${key}] ${arr.length} items (${Date.now()-started}ms)`);
        return arr.map((x) => normalizeItem({ ...x, fuente: x.fuente || key }));
      } catch (e) {
        console.warn(`Provider falló (${key}):`, e?.message || e);
        return [];
      }
    });

  const batches = await Promise.all(acts);
  let items = dedupe(batches.flat());

  items = filterByTopics(items, topics);
  if (lang && lang !== "all") items = filterByLang(items, lang);
  items = items.filter((n) => isAllowedComplete(n, Boolean(completos)));

  const mediaScore = (x) => (x?.video ? 2 : x?.imagen ? 1 : 0);
  items.sort((a, b) => {
    const d = new Date(b.fecha || 0) - new Date(a.fecha || 0);
    return d || (mediaScore(b) - mediaScore(a));
  });

  const L = Math.max(1, Number(limit) || 12);
  const P = Math.max(1, Number(page) || 1);
  const start = (P - 1) * L;
  const end = start + L;

  return {
    ok: true,
    items: items.slice(start, end),
    pagination: {
      page: P,
      limit: L,
      total: items.length,
      pages: Math.ceil(items.length / L) || 0,
      nextPage: end < items.length ? P + 1 : null,
      hasMore: end < items.length,
    },
    filtros: {
      tipo,
      lang,
      q,
      since: since ? new Date(since).toISOString() : null,
      topics,
      providers: list,
      completos: Boolean(completos),
    },
  };
}

// Export agrupado (opcional)
export default { REGISTRY, DEFAULT_JURIDICAS, DEFAULT_GENERALES, collectFromProviders };
