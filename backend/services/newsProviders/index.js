// backend/services/newsProviders/index.js
import { filterByTopics, filterByLang, isCompleteEnough, normalizeItem } from "./_helpers.js";

// Importa SOLO los proveedores que quieres habilitar
import poderJudicial from "./poderJudicialProvider.js";
import tc from "./tcProvider.js";
import gaceta from "./gacetaJuridicaProvider.js";
import legis from "./legisPeProvider.js";
import onu from "./onuProvider.js";
import sunarp from "./sunarpProvider.js";
import corteidh from "./corteIDHProvider.js";
import cij from "./cjprovider.js";
import jnj from "./jnjProvider.js";
import elPeruano from "./elPeruanoProvider.js";

// Generales / agregadores (si los quieres usar):
import gnews from "./gnewsProvider.js";
import newsapi from "./newsApiProvider.js";

// === Registro: clave â†’ fetchFn ===
export const REGISTRY = {
  // JurÃ­dicas (por defecto)
  poderJudicial,
  tc,
  gaceta,
  legis,
  onu,
  sunarp,
  corteidh,
  cij,
  jnj,
  elPeruano,

  // Generales (usa solo si los seleccionas)
  gnews,
  newsapi,
  cyber,
};

// === Conjuntos por tipo ===
export const DEFAULT_JURIDICAS = [
  "poderJudicial", "tc", "gaceta", "legis", "onu", "sunarp", "corteidh", "cij", "jnj", "elPeruano",
];

export const DEFAULT_GENERALES = [
  // Pon aquÃ­ solo si quieres agregadores por defecto
  "gnews", "newsapi"
];

// === Temas permitidos (whitelist para tu sitio) ===
const ALLOWED_TOPICS = [
  "jurisprudencia", "doctrina", "procesal", "reformas",
  "precedente", "casaciÃ³n", "tribunal constitucional",
  "constitucional", "civil", "penal", "laboral", "administrativo",
  "registral", "ambiental", "notarial", "penitenciario",
  "consumidor", "seguridad social",
];

// HeurÃ­stica de â€œcompletosâ€: mÃ­nimo caracteres y pÃ¡rrafos
const isAllowedComplete = (n, exigirCompletos) => {
  if (!exigirCompletos) return true;
  return isCompleteEnough(n?.resumen || n?.contenido || "", n?.bodyHtml);
};

// === Agregador principal ===
export async function collectFromProviders({
  tipo = "juridica",
  providers,             // array de claves o csv
  q,                     // texto/busqueda
  lang = "es",           // â€œesâ€ preferido
  topics = ALLOWED_TOPICS,
  completos = false,     // exigir artÃ­culos â€œlargosâ€
  limit = 12,
  page = 1,
} = {}) {
  const wanted = Array.isArray(providers) && providers.length
    ? providers
    : (tipo === "juridica" ? DEFAULT_JURIDICAS : DEFAULT_GENERALES);

  const acts = wanted
    .map(k => REGISTRY[k])
    .filter(Boolean)
    .map(async fetchFn => {
      try {
        const raw = await fetchFn({ q, lang });
        return (Array.isArray(raw) ? raw : []).map(normalizeItem);
      } catch (e) {
        console.warn("Provider fallÃ³:", e?.message || e);
        return [];
      }
    });

  const batches = await Promise.all(acts);
  let items = batches.flat();

  // Filtro por tema/idioma/contenido
  items = filterByTopics(items, topics);
  items = filterByLang(items, lang || "es");
  items = items.filter(n => isAllowedComplete(n, completos));

  // Orden multimedia > fecha
  items.sort((a, b) => {
    const toScore = (x) => (x.video ? 2 : (x.imagen ? 1 : 0));
    const sDiff = toScore(b) - toScore(a);
    if (sDiff) return sDiff;
    const da = new Date(a.fecha || 0).getTime();
    const db = new Date(b.fecha || 0).getTime();
    return db - da;
  });

  // PaginaciÃ³n
  const start = (Number(page) - 1) * Number(limit);
  const end = start + Number(limit);
  const slice = items.slice(start, end);

  return {
    items: slice,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: items.length,
      pages: Math.ceil(items.length / Number(limit)),
      nextPage: end < items.length ? Number(page) + 1 : null,
    },
    filtros: { tipo, lang, topics, providers: wanted, completos: Boolean(completos) },
  };
}
