// ============================================================
// 🦉 BúhoLex | scrapingProvider (agregador en memoria)
// - Ejecuta providers del REGISTRY en paralelo (sin persistir)
// - Soporta filtros y pagina en memoria
// - Estándar: export default async function (...)
// ============================================================

import { REGISTRY, DEFAULT_JURIDICAS, DEFAULT_GENERALES } from "./index.js";
import {
  normalizeItem,
  filterByLang,
  filterByTopics,
  isCompleteEnough,
  dedupe,
} from "./_helpers.js";

// ---------- Config ----------
const DEFAULT_CONCURRENCY = 4;
const DEFAULT_TIMEOUT_MS = 20000;

// Mapa de defaults por tipo
const DEFAULTS = {
  juridica: DEFAULT_JURIDICAS,
  general: DEFAULT_GENERALES,
};

// ---------- Helpers ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function chunk(arr = [], size = 4) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function withTimeout(promise, ms, label = "task") {
  let t;
  const killer = new Promise((_, rej) => {
    t = setTimeout(() => rej(new Error(`Timeout ${label} (${ms}ms)`)), ms);
  });
  try {
    return await Promise.race([promise, killer]);
  } finally {
    clearTimeout(t);
  }
}

function getWantedProviders({ tipo, providers }) {
  const base =
    Array.isArray(providers) && providers.length
      ? providers
      : DEFAULTS[tipo] || DEFAULTS.general || [];
  return base
    .map((k) => String(k || "").trim().toLowerCase())
    .filter(Boolean)
    .filter((k, i, a) => a.indexOf(k) === i); // dedupe por clave
}

function toDate(v) {
  if (!v) return null;
  try {
    const d = new Date(v);
    return Number.isNaN(+d) ? null : d;
  } catch {
    return null;
  }
}

// ---------- Provider principal ----------
/**
 * Ejecuta providers y retorna una página de resultados normalizados.
 *
 * @param {Object} opts
 * @param {'juridica'|'general'} opts.tipo
 * @param {number} opts.page
 * @param {number} opts.limit
 * @param {string} opts.q           - palabras clave (puede llevar comas)
 * @param {string} opts.lang        - 'es' por defecto
 * @param {string} opts.especialidad- filtro ligero por texto
 * @param {Array<string>} opts.providers - claves del REGISTRY
 * @param {boolean|number} opts.completos - filtra por tamaño de resumen
 * @param {Date|number|string|null} opts.since - fecha mínima
 * @param {number} opts.concurrency  - # de providers en paralelo
 * @param {number} opts.timeoutMs    - timeout por provider
 */
export default async function obtenerNoticias(opts = {}) {
  const {
    tipo = "general",
    page = 1,
    limit = 10,
    q = "",
    lang = "es",
    especialidad = "todas",
    providers = [],
    completos = 0,
    since = null,
    concurrency = DEFAULT_CONCURRENCY,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = opts;

  const wanted = getWantedProviders({ tipo, providers });

  // ---- Ejecutar providers con control de concurrencia + timeout
  const batches = [];
  const groups = chunk(wanted, Math.max(1, +concurrency || DEFAULT_CONCURRENCY));

  for (const group of groups) {
    const results = await Promise.allSettled(
      group.map(async (k) => {
        const fn = REGISTRY?.[k];
        if (typeof fn !== "function") {
          console.warn(`[provider:${k}] no es función en REGISTRY`);
          return [];
        }
        try {
          const raw = await withTimeout(
            Promise.resolve(
              fn({ q, page, limit, lang, especialidad, since, tipo })
            ),
            timeoutMs,
            `provider:${k}`
          );
          return Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : [];
        } catch (e) {
          console.warn(`[provider:${k}]`, e?.message || e);
          return [];
        }
      })
    );

    // Merge de grupo
    const merged = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
    batches.push(merged);

    // Pequeño respiro para no agredir fuentes
    await sleep(80);
  }

  // ---- Normaliza y junta
  let items = batches.flat().map(normalizeItem);

  // ---- Filtro por 'since'
  if (since) {
    const d =
      since instanceof Date
        ? since
        : typeof since === "number"
        ? new Date(since)
        : new Date(String(since));
    if (!Number.isNaN(+d)) {
      items = items.filter((n) => {
        const nf = toDate(n.fecha);
        return nf ? nf >= d : true;
      });
    }
  }

  // ---- Filtro opcional por especialidad (texto; ideal hacerlo en DB)
  if (especialidad && String(especialidad).toLowerCase() !== "todas") {
    const needle = String(especialidad).toLowerCase();
    items = items.filter((n) =>
      `${n.titulo || ""} ${n.resumen || ""} ${n.fuente || ""}`
        .toLowerCase()
        .includes(needle)
    );
  }

  // ---- Filtros por idioma y tópicos (a partir de q, separado por comas)
  if (lang && lang !== "all") items = filterByLang(items, lang);

  if (q && q.trim()) {
    const topics = q
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (topics.length) items = filterByTopics(items, topics);
  }

  // ---- “Completos” según heurística de tamaño (resumen)
  if (completos) items = items.filter((n) => isCompleteEnough(n.resumen || "", ""));

  // ---- Quitar duplicados por URL / (fuente+titulo)
  items = dedupe(items);

  // ---- Orden: multimedia > fecha desc
  const mediaScore = (n) => (n?.video ? 2 : n?.imagen ? 1 : 0);
  items.sort((a, b) => {
    const ms = mediaScore(b) - mediaScore(a);
    if (ms) return ms;
    const tb = new Date(b.fecha || 0).getTime();
    const ta = new Date(a.fecha || 0).getTime();
    return tb - ta;
  });

  // ---- Paginación en memoria
  const p = Math.max(1, Number(page) || 1);
  const L = Math.max(1, Number(limit) || 10);
  const start = (p - 1) * L;
  const end = start + L;
  const pageItems = items.slice(start, end);

  return {
    ok: true,
    items: pageItems,
    pagination: {
      page: p,
      limit: L,
      total: items.length,
      pages: Math.ceil(items.length / L) || 0,
      nextPage: end < items.length ? p + 1 : null,
    },
    filtros: {
      tipo,
      especialidad,
      q,
      lang,
      providers: wanted,
      completos: !!completos,
      since: since ? new Date(since) : null,
    },
  };
}
