// ============================================================
// 🦉 BúhoLex | Aggregator de Providers (scraping / RSS)
// - Soporta: tipo, especialidad, q, lang, providers, completos, since
// - Dedup por enlace, normaliza providers, timeouts por provider
// - Por defecto: jurídicas → últimos 2 días si no mandan 'since'
// ============================================================
import { REGISTRY, DEFAULTS } from "./newsProviders/index.js";
import {
  normalizeItem,
  filterByLang,
  filterByTopics,
  isCompleteBySummary,
} from "./newsProviders/_helpers.js";

/* -------------------- Utils -------------------- */
const clamp = (n, lo, hi) => Math.min(Math.max(Number(n) || 0, lo), hi);
const norm = (s = "") =>
  String(s).toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").trim();

function parseProviders(input) {
  if (!input) return [];
  const arr = Array.isArray(input) ? input : String(input).split(",");
  return arr
    .map((x) =>
      norm(x)
        .replace(/^https?:\/\/(www\.)?/, "")
        .replace(/\.(pe|com|org|net|es)$/g, "")
        .replace(/\./g, "")
        .replace(/noticias$/i, "")
        // alias amigables
        .replace(/^pj$/, "poder judicial")
        .replace(/^pjudicial$/, "poder judicial")
        .replace(/^tribunal constitucional$/, "tc")
        .replace(/^legis$/, "legis.pe")
    )
    .filter(Boolean);
}

function twoDaysAgo() {
  return new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
}

function withTimeout(promise, ms, label = "provider") {
  return new Promise((resolve) => {
    const id = setTimeout(() => resolve({ __timeout: true, __label: label }), ms);
    promise
      .then((v) => {
        clearTimeout(id);
        resolve(v);
      })
      .catch((_e) => {
        clearTimeout(id);
        resolve({ __error: true, __label: label });
      });
  });
}

/* -------------------- Comparator -------------------- */
// 1) fecha desc  2) mediaScore desc  3) legis.pe priorizado (si empata)
const mediaScore = (n) => (n?.video ? 2 : n?.imagen ? 1 : 0);
function compareNews(a, b) {
  const da = new Date(a.fecha || 0).getTime();
  const db = new Date(b.fecha || 0).getTime();
  if (db !== da) return db - da;
  const m = mediaScore(b) - mediaScore(a);
  if (m) return m;
  const fa = norm(a.fuente || "");
  const fb = norm(b.fuente || "");
  if (fa.includes("legis") && !fb.includes("legis")) return -1;
  if (!fa.includes("legis") && fb.includes("legis")) return 1;
  return 0;
}

/* -------------------- Dedupe -------------------- */
function dedupeByLink(items) {
  const seen = new Set();
  return items.filter((n) => {
    const k = n?.enlace || "";
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/* ============================================================
   API principal
============================================================ */
export async function obtenerNoticias({
  tipo = "general",
  page = 1,
  limit = 10,
  q = "",
  lang = "es",
  especialidad = "todas",
  providers = [],
  completos = 0,
  since, // opcional: ISO o Date; si no llega y tipo=juridica → 2 días
}) {
  const Page = clamp(page, 1, 10000);
  const Limit = clamp(limit, 1, 50);

  // Resolución de providers
  let providerKeys;
  const parsed = parseProviders(providers);
  if (parsed.length === 1 && parsed[0] === "all") {
    providerKeys = Object.keys(REGISTRY);
  } else if (parsed.length > 0) {
    providerKeys = parsed.filter((k) => !!REGISTRY[k]);
  } else {
    providerKeys = DEFAULTS[tipo] || DEFAULTS.general || Object.keys(REGISTRY);
  }
  if (!providerKeys.length) providerKeys = Object.keys(REGISTRY);

  // Ventana temporal
  let sinceDate = null;
  if (since) {
    const d = new Date(since);
    if (!Number.isNaN(+d)) sinceDate = d;
  } else if (norm(tipo) === "juridica") {
    sinceDate = twoDaysAgo();
  }

  // Ejecuta providers en paralelo, cada uno con timeout
  const FETCH_TIMEOUT_MS = 15000; // 15s por provider
  const settled = await Promise.all(
    providerKeys.map((k) =>
      withTimeout(
        REGISTRY[k].fetchNoticias({
          // dejamos al provider libertad interna
          q,
          lang,
          especialidad,
          // page/limit pueden ser ignorados por el provider si no aplican
          page: Page,
          limit: Limit,
          since: sinceDate,
          tipo: norm(tipo),
        }),
        FETCH_TIMEOUT_MS,
        k
      )
    )
  );

  // Junta + normaliza
  let items = [];
  for (let i = 0; i < settled.length; i++) {
    const r = settled[i];
    if (Array.isArray(r)) {
      items.push(...r.map(normalizeItem));
    } else if (r && Array.isArray(r.items)) {
      items.push(...r.items.map(normalizeItem));
    } else {
      // r.__timeout o r.__error → lo ignoramos silenciosamente
    }
  }

  // Ventana temporal (si algún provider no la aplicó)
  if (sinceDate) {
    items = items.filter((n) => {
      const d = new Date(n.fecha || 0);
      return !Number.isNaN(+d) && d >= sinceDate;
    });
  }

  // Filtros globales
  if (lang && lang !== "all") items = filterByLang(items, lang);

  if (q && q.trim()) {
    const topics = q
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (topics.length) items = filterByTopics(items, topics);
  }

  if (completos) items = items.filter((n) => isCompleteBySummary(n));

  // Dedup por enlace
  items = dedupeByLink(items);

  // Orden recomendado: fecha desc → media → legis
  items.sort(compareNews);

  // Paginación en memoria (global)
  const start = (Page - 1) * Limit;
  const end = start + Limit;
  const pageItems = items.slice(start, end);

  return {
    ok: true,
    items: pageItems,
    pagination: {
      page: Page,
      limit: Limit,
      total: items.length,
      pages: Math.ceil(items.length / Limit) || 0,
      nextPage: end < items.length ? Page + 1 : null,
    },
    filtros: {
      tipo: norm(tipo),
      especialidad: norm(especialidad || "todas"),
      q,
      lang: lang || "all",
      providers: providerKeys,
      completos: !!completos,
      since: sinceDate ? sinceDate.toISOString() : null,
    },
  };
}
