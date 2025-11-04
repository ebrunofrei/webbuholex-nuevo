/* ============================================================
 * 🦉 BúhoLex | Servicio de Noticias (frontend robusto)
 * - BASE: env → localhost:3000/api (sin /api duplicado)
 * - fetch resiliente con backoff (ECONNRESET/ECONNREFUSED/timeout/5xx)
 * - PRIMERO prueba /api/news (live) para "general", luego /api/noticias
 * - Fallback progresivo (con filtros → sin providers → sin q/lang → sin page)
 * - Normalización amplia ({items}|articles|results|noticias|docs|data.*)
 * - Cache TTL + bypass (noCache)
 * - Health-wait: espera /api/health cuando el backend reinicia
 * ============================================================ */

const isBrowser = typeof window !== "undefined";
const DEBUG = !!import.meta?.env?.VITE_DEBUG_NEWS;
export const PAGE_SIZE = 12;
const FETCH_TIMEOUT_MS = 12000;
const CB_KEY = "__news_circuit_breaker__";
const CB_WINDOW_MS = 9000; // 9s

/* ----------------------- BASE URL (NOTICIAS) ----------------------- */
function normalizeApiBase(input) {
  const raw = (input || "").trim().replace(/\/+$/, "");
  if (!raw) return "";
  let base = raw;
  if (!/\/api$/i.test(base)) base += "/api";
  return base.replace(/\/api(?:\/api)+$/i, "/api");
}
function toLocalApi() {
  return normalizeApiBase("${API_BASE}");
}

export const API_BASE = (() => {
  // 👇 ahora priorizamos VITE_NEWS_API_BASE_URL
  const env = normalizeApiBase(import.meta?.env?.VITE_NEWS_API_BASE_URL || "");
  if (env) return env;
  return toLocalApi();
})();

/* --- Espera a que el backend esté listo (evita ECONNRESET al arrancar) --- */
export async function waitForApiReady(base, { retries = 15, delayMs = 300, signal } = {}) {
  const url = `${String(base || "").replace(/\/+$/, "")}/health`;
  for (let i = 0; i < retries; i++) {
    try {
      const ctrl = new AbortController();
      const id = setTimeout(() => ctrl.abort(new Error("timeout")), 3500);
      const res = await fetch(url, { signal: signal || ctrl.signal, headers: { accept: "application/json" } });
      clearTimeout(id);
      if (res.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, delayMs + i * 80));
  }
  return false;
}

/* ----------------------- Utils ----------------------- */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = () => Date.now();

function circuitOpen() {
  try {
    const ts = Number(sessionStorage.getItem(CB_KEY) || 0);
    return ts && now() - ts < CB_WINDOW_MS;
  } catch {
    return false;
  }
}
function circuitTrip() {
  try {
    sessionStorage.setItem(CB_KEY, String(now()));
  } catch {}
}

function toQuery(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    if (Array.isArray(v)) {
      if (k === "providers") q.set(k, v.join(","));
      else v.forEach((x) => q.append(k, x));
    } else {
      q.set(k, String(v));
    }
  });
  const s = q.toString();
  return s ? `?${s}` : "";
}

/* ------------ Normalización de items (clave para el lector) ------------ */
function coalesceImage(raw) {
  const fromEnclosure = raw?.enclosure?.url || raw?.enclosure?.link || "";
  const fromMultimedia = Array.isArray(raw?.multimedia) && raw.multimedia[0]?.url;
  const fromMediaArr = Array.isArray(raw?.media) && (raw.media[0]?.url || raw.media[0]?.src);
  const fromImagesArr = Array.isArray(raw?.images) && raw.images[0]?.url;
  const img =
    raw.imagen ||
    raw.image ||
    raw.imageUrl ||
    raw.thumbnail ||
    raw.thumbnailUrl ||
    raw.urlToImage ||
    fromEnclosure ||
    fromMultimedia ||
    fromMediaArr ||
    fromImagesArr ||
    (typeof raw.media === "string" && /^https?:\/\//i.test(raw.media) ? raw.media : "");
  return img || "";
}

function normalizeGeneralItem(raw = {}) {
  const enlace = raw.enlace || raw.url || raw.link || "";
  const titulo = raw.titulo || raw.title || raw.headline || "(Sin título)";
  const resumen = raw.resumen || raw.description || raw.abstract || raw.snippet || "";
  const imagen = coalesceImage(raw);
  const fuente = raw.fuente || raw.source?.name || raw.source || "";
  const f = raw.fecha || raw.publishedAt || raw.pubDate || raw.date;
  const fecha = f ? new Date(f).toISOString() : null;
  return { ...raw, enlace, titulo, resumen, imagen, fuente, fecha, __hasUrl: !!enlace, tipo: "general" };
}
function normalizeJuridicoItem(raw = {}) {
  const enlace = raw.enlace || raw.url || raw.link || "";
  const titulo = raw.titulo || raw.title || raw.headline || "(Sin título)";
  const resumen = raw.resumen || raw.descripcion || raw.description || "";
  const imagen = coalesceImage(raw);
  const fuente = raw.fuente || raw.proveedor || raw.source || "";
  const f = raw.fecha || raw.publishedAt || raw.pubDate || raw.date;
  const fecha = f ? new Date(f).toISOString() : null;
  return { ...raw, enlace, titulo, resumen, imagen, fuente, fecha, __hasUrl: !!enlace, tipo: "juridica" };
}
function normalizeList(items = [], tipo = "general") {
  const norm = tipo === "juridica" ? normalizeJuridicoItem : normalizeGeneralItem;
  return (Array.isArray(items) ? items : []).map(norm);
}

/* ------------------- Normalización de payloads ------------------- */
function pickItems(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.articles)) return payload.articles;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.noticias)) return payload.noticias;
  if (Array.isArray(payload.docs)) return payload.docs;

  const d = payload.data;
  if (d) {
    if (Array.isArray(d.items)) return d.items;
    if (Array.isArray(d.articles)) return d.articles;
    if (Array.isArray(d.results)) return d.results;
    if (Array.isArray(d.noticias)) return d.noticias;
    if (Array.isArray(d.docs)) return d.docs;
    if (Array.isArray(d)) return d;
  }

  if (payload.items?.data && Array.isArray(payload.items.data)) return payload.items.data;
  if (payload.data?.items?.data && Array.isArray(payload.data.items.data)) {
    return payload.data.items.data;
  }
  return [];
}
function pickPagination(payload) {
  const p = payload?.pagination || payload?.data?.pagination;
  const mp =
    (payload?.data && typeof payload.data.totalDocs === "number" ? payload.data : null) ||
    (typeof payload?.totalDocs === "number" ? payload : null);

  if (p) {
    const page = Number(p.page) || 1;
    const limit = Number(p.limit) || PAGE_SIZE;
    const total = Number(p.total) || 0;
    return {
      page,
      limit,
      total,
      pages: Number(p.pages) || (total && limit ? Math.ceil(total / limit) : 0),
      nextPage: p.nextPage ?? (page * limit < total ? page + 1 : null),
      hasMore: p.hasMore ?? page * limit < total,
    };
  }
  if (mp) {
    return {
      page: Number(mp.page) || 1,
      limit: Number(mp.limit) || PAGE_SIZE,
      total: Number(mp.totalDocs) || 0,
      pages: Number(mp.totalPages) || 0,
      nextPage: mp.hasNextPage ? Number(mp.nextPage) || Number(mp.page) + 1 : null,
      hasMore: !!mp.hasNextPage,
    };
  }
  const len = pickItems(payload).length;
  return { page: 1, limit: PAGE_SIZE, total: len, pages: Math.ceil(len / PAGE_SIZE), nextPage: null, hasMore: false };
}
function pickFiltros(payload) {
  return payload?.filtros || payload?.data?.filtros || {};
}

function safeSessionSet(key, val) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ ts: now(), val }));
  } catch {}
}
function safeSessionGet(key, ttl) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj.ts !== "number") return null;
    if (ttl && now() - obj.ts > ttl) return null;
    return obj.val ?? null;
  } catch {
    return null;
  }
}

/* ----------------------- Core fetch ----------------------- */
async function fetchJSON(url, { signal, timeout = FETCH_TIMEOUT_MS } = {}) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(new Error("timeout")), timeout);
  try {
    const res = await fetch(url, { signal: signal || ctrl.signal, headers: { accept: "application/json" } });
    if (res.status === 204) return {};
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      const err = new Error(`HTTP ${res.status} ${res.statusText}`);
      err.status = res.status;
      err.body = txt;
      throw err;
    }
    try {
      return await res.json();
    } catch {
      return {};
    }
  } finally {
    clearTimeout(id);
  }
}
function isRetryable(err) {
  const msg = (err?.message || "").toLowerCase();
  return (
    /timeout/.test(msg) ||
    /fetch failed/.test(msg) ||
    /network/.test(msg) ||
    /ec[^ ]*refused/.test(msg) ||
    /ec[^ ]*reset/.test(msg) ||
    (err?.status && err.status >= 500)
  );
}

/* =============== PRIMER INTENTO LIVE: /api/news =============== */
async function fetchNewsLive(params, { signal } = {}) {
  const qp = {
    q: params.q,
    lang: params.lang,
    providers: params.providers,
    page: params.page,
    limit: params.limit,
  };
  const url = `${API_BASE}/news${toQuery(qp)}`;
  DEBUG && console.debug(`[Noticias] GET live:`, url);
  const data = await fetchJSON(url, { signal });
  const items = normalizeList(pickItems(data), "general");
  const pagination = pickPagination(data);
  const filtros = pickFiltros(data);
  return { items, pagination, filtros, raw: data };
}

/* ----------------------- API pública: LIVE directo -----------------------
 * Export que faltaba: getNewsLive()
 * Evita el error "does not provide an export named 'getNewsLive'".
 * Usa /api/news con cache y normalización, sin tocar la arquitectura.
 ------------------------------------------------------------------------- */
export async function getNewsLive({
  page = 1,
  limit = PAGE_SIZE,
  q,
  tema,
  lang,            // "all" | "es" | "en"
  providers,       // csv o array
  signal,
  noCache = false,
  cacheTtlMs = 5 * 60 * 1000,
} = {}) {
  await waitForApiReady(API_BASE, { signal });

  const qParam = q ?? tema;
  const providersCsv = Array.isArray(providers)
    ? providers.map((s) => String(s).trim().toLowerCase()).filter(Boolean).join(",")
    : String(providers || "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
        .join(",");

  const cacheKey = `newslive:${page}:${limit}:${qParam || ""}:${lang || "all"}:${providersCsv || "-"}`;
  if (!noCache) {
    const cached = safeSessionGet(cacheKey, cacheTtlMs);
    if (cached) return cached;
  }

  const paramsBase = {
    q: qParam,
    lang: lang && lang !== "all" ? lang : undefined,
    providers: providersCsv || undefined,
    page,
    limit,
  };

  try {
    const live = await fetchNewsLive(paramsBase, { signal });
    const payload = {
      items: live.items,
      pagination: live.pagination,
      filtros: live.filtros,
      page: live.pagination.page || Number(page) || 1,
      raw: live.raw,
    };
    if (!noCache || (payload.items && payload.items.length)) {
      safeSessionSet(cacheKey, payload);
    }
    return payload;
  } catch (e) {
    // devolvemos estructura vacía coherente
    DEBUG && console.warn("[Noticias] getNewsLive falló:", e?.message || e);
    return {
      items: [],
      pagination: { page: Number(page) || 1, limit, total: 0, pages: 0, nextPage: null, hasMore: false },
      filtros: {},
      raw: null,
    };
  }
}

/* ----------------------- API pública (robusto) ----------------------- */
export async function getNoticiasRobust({
  tipo = "general",
  page = 1,
  limit = PAGE_SIZE,
  q,
  tema,
  lang,            // "all" | "es" | "en"
  especialidad,    // "todas"|"civil"|...
  providers,       // csv o array
  signal,
  noCache = false,
  cacheTtlMs = 5 * 60 * 1000,
} = {}) {
  if (circuitOpen()) {
    DEBUG && console.warn("[Noticias] circuit breaker abierto; vacío temporal.");
    return {
      items: [],
      pagination: { page: Number(page) || 1, limit, total: 0, pages: 0, nextPage: null, hasMore: false },
      filtros: {},
      raw: null,
    };
  }

  await waitForApiReady(API_BASE, { signal });

  const qParam = q ?? tema;
  const providersCsv = Array.isArray(providers)
    ? providers.map((s) => String(s).trim().toLowerCase()).filter(Boolean).join(",")
    : String(providers || "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
        .join(",");

  const cacheKey = `news:${tipo}:${page}:${limit}:${qParam || ""}:${lang || "all"}:${especialidad || "todas"}:${providersCsv || "-"}`;
  if (!noCache) {
    const cached = safeSessionGet(cacheKey, cacheTtlMs);
    if (cached) return cached;
  }

  const paramsBase = {
    tipo,
    page,
    limit,
    q: qParam,
    lang: lang && lang !== "all" ? lang : undefined,
    especialidad: especialidad && especialidad !== "todas" ? especialidad : undefined,
    providers: providersCsv || undefined,
  };

  // 0) PRIMER INTENTO LIVE para "general": /api/news
  if (tipo === "general") {
    try {
      const live = await fetchNewsLive(paramsBase, { signal });
      if (!noCache || (live.items && live.items.length)) {
        safeSessionSet(cacheKey, {
          items: live.items,
          pagination: live.pagination,
          filtros: live.filtros,
          page: live.pagination.page || Number(page) || 1,
          raw: live.raw,
        });
      }
      return {
        items: live.items,
        pagination: live.pagination,
        filtros: live.filtros,
        page: live.pagination.page || Number(page) || 1,
        raw: live.raw,
      };
    } catch (e) {
      DEBUG && console.warn("[Noticias] live falló, uso Mongo:", e?.message || e);
      // seguimos con /api/noticias
    }
  }

  // Intentos contra /api/noticias (Mongo)
  const attempts = [
    { etiqueta: "con filtros", params: paramsBase },
    {
      etiqueta: "sin providers",
      params: {
        tipo,
        page,
        limit,
        q: qParam,
        lang: lang && lang !== "all" ? lang : undefined,
        especialidad: especialidad && especialidad !== "todas" ? especialidad : undefined,
      },
    },
    { etiqueta: "sin q/lang", params: { tipo, page, limit } },
    { etiqueta: "sin page", params: { tipo, limit } },
  ];

  let lastErr = null;

  for (let i = 0; i < attempts.length; i++) {
    const { etiqueta, params } = attempts[i];
    const url = `${API_BASE}/noticias${toQuery(params)}`;
    try {
      DEBUG && console.debug(`[Noticias] GET ${etiqueta}:`, url);
      const data = await fetchJSON(url, { signal });

      const items = normalizeList(pickItems(data), tipo);
      const pagination = pickPagination(data);
      const filtros = pickFiltros(data);

      const payload = {
        items,
        pagination,
        filtros,
        page: pagination.page || Number(page) || 1,
        raw: data,
      };

      if (!noCache || (Array.isArray(items) && items.length > 0)) {
        safeSessionSet(cacheKey, payload);
      }
      return payload;
    } catch (e) {
      lastErr = e;
      if (isRetryable(e)) {
        await sleep(200 + i * 150); // backoff: 200/350/500/650ms
        continue;
      }
      break;
    }
  }

  circuitTrip();
  DEBUG && console.warn("⚠️ Noticias vacío/fallo:", lastErr?.message || lastErr);
  const empty = {
    items: [],
    pagination: { page: Number(page) || 1, limit, total: 0, pages: 0, nextPage: null, hasMore: false },
    filtros: {},
    raw: null,
  };
  if (!noCache) safeSessionSet(cacheKey, empty);
  return empty;
}

export async function getEspecialidades({ tipo = "juridica", lang, signal } = {}) {
  const url = `${API_BASE}/noticias/especialidades${toQuery({
    tipo,
    lang: lang && lang !== "all" ? lang : undefined,
  })}`;
  DEBUG && console.debug("[Noticias] GET", url);
  const data = await fetchJSON(url, { signal });
  const list =
    Array.isArray(data?.items) ? data.items :
    Array.isArray(data?.data?.items) ? data.data.items : [];
  return list;
}

export function clearNoticiasCache() {
  try {
    if (!isBrowser) return;
    Object.keys(sessionStorage).forEach((k) => {
      if (k.startsWith("news:") || k.startsWith("newslive:")) sessionStorage.removeItem(k);
    });
  } catch {}
}

/* ---------- Media proxy helpers (alineado a backend) ---------- */
export function proxifyMedia(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) {
    const base = String(API_BASE || "").replace(/\/+$/, "");
    // tu backend expone /api/media/proxy?url=..., no /media “plano”
    return `${base}/media/proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

/* Reexport del extractor de contenidos */
export { getContenidoNoticia } from "./noticiasContenido.js";

// ---- Compatibilidad con imports antiguos ----
export { getNoticiasRobust as getNoticias };
export { getNoticiasRobust as fetchNoticias };
export { getNoticiasRobust as getNoticiasLive };
