// src/services/noticiasClientService.js
// ============================================================
// 🦉 BúhoLex | Servicio de Noticias (frontend robusto · PROD)
// - BASE vía apiBase.js: sin localhost hardcodeado
// - fetch con timeout + backoff + circuit breaker (storage o memoria)
// - General: adaptador único getGeneralNews (live /news → fallback /noticias)
// - Jurídica: /api/noticias
// - Chips: /api/noticias/especialidades · /api/noticias/temas
// - Normalización: imagenResuelta + fecha smart + dedupe
// - Cache TTL + bypass (noCache)
// - Health-wait: /api/health al iniciar
// ============================================================

import { API_BASE, joinApi, apiFetch } from "./apiBase";

const IS_BROWSER = typeof window !== "undefined";
export const PAGE_SIZE = 12;

const FETCH_TIMEOUT_MS = 12000;
const DEBUG = (import.meta?.env?.VITE_DEBUG_NEWS ?? "false").toString().toLowerCase() === "true";

/* ----------------------- Circuit breaker ----------------------- */
const CB_KEY = "__news_circuit_breaker__";
const CB_WINDOW_MS = 9000;
let memCB = 0; // fallback en SSR/privado

function now() { return Date.now(); }

function cbOpen() {
  try {
    if (IS_BROWSER && window.sessionStorage) {
      const ts = Number(sessionStorage.getItem(CB_KEY) || 0);
      return ts && now() - ts < CB_WINDOW_MS;
    }
  } catch {}
  return memCB && now() - memCB < CB_WINDOW_MS;
}
function cbTrip() {
  try {
    if (IS_BROWSER && window.sessionStorage) {
      sessionStorage.setItem(CB_KEY, String(now()));
    } else {
      memCB = now();
    }
  } catch { memCB = now(); }
}

/* ----------------------- Health wait ----------------------- */
export async function waitForApiReady(base = API_BASE, { retries = 12, delayMs = 300, signal } = {}) {
  const url = `${String(base || "").replace(/\/+$/, "")}/health`;
  for (let i = 0; i < retries; i++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(new Error("timeout")), 3500);
    try {
      const r = await apiFetch(url, {
        signal: signal || ctrl.signal,
        headers: { accept: "application/json" },
      });
      if (r.ok) { clearTimeout(timer); return true; }
    } catch {}
    clearTimeout(timer);
    await sleep(delayMs + i * 80);
  }
  return false;
}

/* ----------------------- Utils ----------------------- */
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function toQuery(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    if (Array.isArray(v)) {
      if (k === "providers") q.set(k, v.join(","));
      else v.forEach((x) => q.append(k, x));
    } else q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : "";
}

// Cache en sessionStorage con TTL; si no hay storage, usa memoria
const memCache = new Map();
function safeSet(key, val) {
  try {
    if (IS_BROWSER && window.sessionStorage) {
      sessionStorage.setItem(key, JSON.stringify({ ts: now(), val }));
      return;
    }
  } catch {}
  memCache.set(key, { ts: now(), val });
}
function safeGet(key, ttl) {
  try {
    if (IS_BROWSER && window.sessionStorage) {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || typeof obj.ts !== "number") return null;
      if (ttl && now() - obj.ts > ttl) return null;
      return obj.val ?? null;
    }
  } catch {}
  const o = memCache.get(key);
  if (!o) return null;
  if (ttl && now() - o.ts > ttl) return null;
  return o.val ?? null;
}

function isRetryable(err) {
  const msg = (err?.message || "").toLowerCase();
  return (
    /timeout/.test(msg) || /fetch failed/.test(msg) || /network/.test(msg) ||
    /ec[^ ]*refused/.test(msg) || /ec[^ ]*reset/.test(msg) ||
    (err?.status && err.status >= 500)
  );
}

async function fetchJSON(url, { signal, timeout = FETCH_TIMEOUT_MS } = {}) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(new Error("timeout")), timeout);
  try {
    const res = await apiFetch(url, {
      signal: signal || ctrl.signal,
      headers: { accept: "application/json" },
    });
    if (res.status === 204) return {};
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      const err = new Error(`HTTP ${res.status} ${res.statusText}`);
      err.status = res.status; err.body = txt;
      throw err;
    }
    try { return await res.json(); } catch { return {}; }
  } finally { clearTimeout(id); }
}

/* ---------------- Providers: normalización ---------------- */
function normalizeProviderName(s = "") {
  let x = String(s).trim().toLowerCase();
  if (!x) return "";
  x = x.replace(/^https?:\/\/(www\.)?/, "");
  x = x.replace(/\.(com|org|net|pe|es|co|ar|mx|br|uk|us)(\/.*)?$/i, "");
  x = x.replace(/\./g, "");
  x = x.replace(/theguardian/, "guardian");
  x = x.replace(/nytimes/, "nyt");
  x = x.replace(/^elpais$/, "el pais");
  x = x.replace(/^pjudicial$|^pj$/, "poder judicial");
  x = x.replace(/^tribunalconst(itucional)?$/, "tribunal constitucional");
  x = x.replace(/^associatedpress$|^apnews$|^apvideo$/, "ap");
  x = x.replace(/^reutersvideo$/, "reuters");
  return x;
}
function normalizeProviders(input) {
  if (!input) return [];
  const arr = Array.isArray(input) ? input : String(input).split(",");
  return Array.from(new Set(arr.map((p) => normalizeProviderName(p)).filter(Boolean)));
}

/* ----------------------- Fecha robusta ----------------------- */
// Acepta: ISO, yyyy-mm-dd, dd/mm/yyyy, dd-mm-yyyy, timestamp, con hh:mm:ss opcional
function parseFechaSmart(input) {
  if (!input) return null;
  if (input instanceof Date && !isNaN(+input)) return input;

  const s = String(input).trim();

  if (/^\d{4}[-/]\d{2}[-/]\d{2}/.test(s) || /^\d+$/.test(s)) {
    const d = new Date(s);
    return isNaN(+d) ? null : d;
  }
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    const dd = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    const yy = parseInt(m[3], 10);
    const hh = parseInt(m[4] || "0", 10);
    const mi = parseInt(m[5] || "0", 10);
    const ss = parseInt(m[6] || "0", 10);
    if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) {
      const d = new Date(yy, mm - 1, dd, hh, mi, ss);
      return isNaN(+d) ? null : d;
    }
  }
  const d = new Date(s);
  return isNaN(+d) ? null : d;
}

/* ----------------------- Normalización ----------------------- */
function coalesceImage(raw) {
  const fromEnclosure = raw?.enclosure?.url || raw?.enclosure?.link || "";
  const fromMultimedia = Array.isArray(raw?.multimedia) && raw.multimedia[0]?.url;
  const fromMediaArr = Array.isArray(raw?.media) && (raw.media[0]?.url || raw.media[0]?.src);
  const fromImagesArr = Array.isArray(raw?.images) && raw.images[0]?.url;
  const img =
    raw.imagenResuelta ||
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

function stableId(n = {}) {
  const id = n._id || n.id || "";
  if (id) return id;
  const src = [
    n.fuenteNorm || n.fuente || n.source?.name || "",
    n.link || n.enlace || n.url || "",
    n.titulo || n.title || "",
    n.fecha || n.publishedAt || "",
  ].join("|");
  let h = 0; for (let i = 0; i < src.length; i++) h = (h * 31 + src.charCodeAt(i)) >>> 0;
  return `n_${h}`;
}

function normalizeGeneralItem(raw = {}) {
  const enlace = raw.enlace || raw.url || raw.link || "";
  const titulo = raw.titulo || raw.title || raw.headline || "(Sin título)";
  const resumen = raw.resumen || raw.description || raw.abstract || raw.snippet || "";
  const imagen = coalesceImage(raw);
  const fuente = raw.fuente || raw.source?.name || raw.source || raw.fuenteNorm || "";
  const f = raw.fecha || raw.publishedAt || raw.pubDate || raw.date || raw.createdAt;
  const d = parseFechaSmart(f);
  const fecha = d ? d.toISOString() : null;
  return { ...raw, id: stableId(raw), enlace, titulo, resumen, imagen, fuente, fecha, __hasUrl: !!enlace, tipo: "general" };
}
function normalizeJuridicoItem(raw = {}) {
  const enlace = raw.enlace || raw.url || raw.link || "";
  const titulo = raw.titulo || raw.title || raw.headline || "(Sin título)";
  const resumen = raw.resumen || raw.descripcion || raw.description || "";
  const imagen = coalesceImage(raw);
  const fuente = raw.fuente || raw.proveedor || raw.source || raw.fuenteNorm || "";
  const f = raw.fecha || raw.publishedAt || raw.pubDate || raw.date || raw.createdAt;
  const d = parseFechaSmart(f);
  const fecha = d ? d.toISOString() : null;
  return { ...raw, id: stableId(raw), enlace, titulo, resumen, imagen, fuente, fecha, __hasUrl: !!enlace, tipo: "juridica" };
}
function normalizeList(items = [], tipo = "general") {
  const norm = tipo === "juridica" ? normalizeJuridicoItem : normalizeGeneralItem;
  return (Array.isArray(items) ? items : []).map(norm);
}
const sortByDateDesc = (a, b) => (b?.fecha ? +new Date(b.fecha) : 0) - (a?.fecha ? +new Date(a.fecha) : 0);

function dedupeByKey(items = []) {
  const map = new Map();
  for (const n of items) {
    const k = n.enlace || n.url || n.link || n.id || "";
    if (!k) continue;
    if (!map.has(k)) map.set(k, n);
  }
  return Array.from(map.values());
}

/* ------------------- Normalización payload ------------------- */
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
  if (payload.data?.items?.data && Array.isArray(payload.data.items.data)) return payload.data.items.data;
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
      page, limit, total,
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

/* =============== /api/news (solo general) =============== */
async function fetchNewsLive(params, { signal } = {}) {
  const qp = {
    q: params.q,
    tema: params.tema,
    lang: params.lang,
    providers: params.providers,
    page: params.page,
    limit: params.limit,
  };
  const url = joinApi(`/news${toQuery(qp)}`);
  DEBUG && console.debug(`[Noticias] GET live:`, url);
  const data = await fetchJSON(url, { signal });
  const items = normalizeList(pickItems(data), "general");
  return { items, pagination: pickPagination(data), filtros: pickFiltros(data), raw: data };
}

/* ----------------- getNewsLive (con caché) ----------------- */
export async function getNewsLive({
  page = 1, limit = PAGE_SIZE, q, tema, lang, providers, signal,
  noCache = false, cacheTtlMs = 5 * 60 * 1000,
} = {}) {
  await waitForApiReady(API_BASE, { signal });

  const providersArr = normalizeProviders(providers);
  const providersCsv = providersArr.join(",");

  const qParam = q ?? tema;
  const cacheKey = `newslive:${page}:${limit}:${qParam || ""}:${lang || "all"}:${providersCsv || "-"}`;
  if (!noCache) {
    const cached = safeGet(cacheKey, cacheTtlMs);
    if (cached) return cached;
  }

  const paramsBase = {
    q: qParam,
    tema,
    lang: lang && lang !== "all" ? lang : undefined,
    providers: providersCsv || undefined,
    page, limit,
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
    if (!noCache || (payload.items && payload.items.length)) safeSet(cacheKey, payload);
    return payload;
  } catch (e) {
    DEBUG && console.warn("[Noticias] getNewsLive falló:", e?.message || e);
    return {
      items: [],
      pagination: { page: Number(page) || 1, limit, total: 0, pages: 0, nextPage: null, hasMore: false },
      filtros: {},
      raw: null,
    };
  }
}

/* -------- Adaptador ÚNICO para GENERALES (live → mongo) -------- */
export async function getGeneralNews({
  page = 1, limit = PAGE_SIZE, q, tema, lang, providers, signal,
  noCache = false, cacheTtlMs = 5 * 60 * 1000,
} = {}) {
  const providersArr = normalizeProviders(providers);
  const providersCsv = providersArr.join(",");
  const cacheKey = `general:adapt:${page}:${limit}:${q || ""}:${tema || ""}:${lang || "all"}:${providersCsv || "-"}`;
  if (!noCache) {
    const cached = safeGet(cacheKey, cacheTtlMs);
    if (cached) return cached;
  }

  // 1) Intento live (/news)
  const live = await getNewsLive({ page, limit, q, tema, lang, providers: providersArr, signal, noCache, cacheTtlMs });

  if (Array.isArray(live.items) && live.items.length) {
    safeSet(cacheKey, live);
    return live;
  }

  // 2) Fallback: /api/noticias?tipo=general
  const mongo = await getNoticiasRobust({
    tipo: "general",
    page,
    limit,
    q,
    tema,
    lang,
    providers: providersArr,
    signal,
    noCache,
    cacheTtlMs,
  });

  // 3) Merge
  const items = dedupeByKey([...(live.items || []), ...(mongo.items || [])]).sort(sortByDateDesc);

  const payload = {
    items,
    pagination: mongo.pagination || live.pagination || {
      page, limit, total: items.length, pages: Math.ceil(items.length / limit), nextPage: null, hasMore: false,
    },
    filtros: mongo.filtros || live.filtros || {},
    page: (mongo.pagination?.page || live.pagination?.page || page),
    raw: { live, mongo },
  };
  if (!noCache || items.length) safeSet(cacheKey, payload);
  return payload;
}

/* ----------------------- /api/noticias (Mongo) ----------------------- */
export async function getNoticiasRobust({
  tipo = "general",
  page = 1, limit = PAGE_SIZE,
  q, tema, lang, especialidad, providers, signal,
  noCache = false, cacheTtlMs = 5 * 60 * 1000,
} = {}) {
  if (cbOpen()) {
    DEBUG && console.warn("[Noticias] circuit breaker abierto; vacío temporal.");
    return { items: [], pagination: { page: Number(page) || 1, limit, total: 0, pages: 0, nextPage: null, hasMore: false }, filtros: {}, raw: null };
  }

  await waitForApiReady(API_BASE, { signal });

  const providersArr = normalizeProviders(providers);
  const providersCsv = providersArr.join(",");
  const providersParam = providersCsv === "all" ? undefined : (providersCsv || undefined);

  const cacheKey = `news:${tipo}:${page}:${limit}:${q || ""}:${tema || ""}:${lang || "all"}:${especialidad || "todas"}:${providersParam || "-"}`;
  if (!noCache) {
    const cached = safeGet(cacheKey, cacheTtlMs);
    if (cached) return cached;
  }

  if (tipo === "general") {
    try {
      const live = await fetchNewsLive(
        { q: q ?? undefined, tema, lang: lang && lang !== "all" ? lang : undefined, providers: providersParam, page, limit },
        { signal }
      );
      const payload = { items: live.items, pagination: live.pagination, filtros: live.filtros, page: live.pagination.page || Number(page) || 1, raw: live.raw };
      if (!noCache || (payload.items && payload.items.length)) safeSet(cacheKey, payload);
      return payload;
    } catch (e) { DEBUG && console.warn("[Noticias] live falló, uso Mongo:", e?.message || e); }
  }

  const paramsBase = {
    tipo, page, limit,
    q: q ?? undefined,
    tema: tipo === "general" ? (tema || undefined) : undefined,
    lang: lang && lang !== "all" ? lang : undefined,
    especialidad: tipo === "juridica" && especialidad && especialidad !== "todas" ? especialidad : undefined,
    providers: providersParam,
  };

  const attempts = [
    { etiqueta: "con filtros", params: paramsBase },
    { etiqueta: "sin providers", params: { ...paramsBase, providers: undefined } },
    { etiqueta: "sin q/lang/tema/especialidad", params: { tipo, page, limit } },
    { etiqueta: "sin page", params: { tipo, limit } },
  ];

  let lastErr = null;
  for (let i = 0; i < attempts.length; i++) {
    const { etiqueta, params } = attempts[i];
    const url = joinApi(`/noticias${toQuery(params)}`);
    try {
      DEBUG && console.debug(`[Noticias] GET ${etiqueta}:`, url);
      const data = await fetchJSON(url, { signal });
      const items = normalizeList(pickItems(data), tipo);
      const payload = {
        items,
        pagination: pickPagination(data),
        filtros: pickFiltros(data),
        page: Number(pickPagination(data).page) || Number(page) || 1,
        raw: data,
      };
      if (!noCache || (Array.isArray(items) && items.length > 0)) safeSet(cacheKey, payload);
      return payload;
    } catch (e) {
      lastErr = e;
      if (isRetryable(e)) { await sleep(200 * (i + 1)); continue; }
      break;
    }
  }

  cbTrip();
  DEBUG && console.warn("⚠️ Noticias vacío/fallo:", lastErr?.message || lastErr);
  const empty = { items: [], pagination: { page: Number(page) || 1, limit, total: 0, pages: 0, nextPage: null, hasMore: false }, filtros: {}, raw: null };
  if (!noCache) safeSet(cacheKey, empty);
  return empty;
}

/* ----------------------- Chips ----------------------- */
export async function getEspecialidades({ tipo = "juridica", lang, signal } = {}) {
  const url = joinApi(`/noticias/especialidades${toQuery({ tipo, lang: lang && lang !== "all" ? lang : undefined })}`);
  DEBUG && console.debug("[Noticias] GET", url);
  const data = await fetchJSON(url, { signal });
  const list = Array.isArray(data?.items) ? data.items : Array.isArray(data?.data?.items) ? data.data.items : [];
  return list;
}
export async function getTemas({ lang = "es", signal } = {}) {
  const url = joinApi(`/noticias/temas${toQuery({ tipo: "general", lang })}`);
  DEBUG && console.debug("[Noticias] GET", url);
  const data = await fetchJSON(url, { signal });
  const list = Array.isArray(data?.items) ? data.items : Array.isArray(data?.data?.items) ? data.data.items : [];
  return list;
}

/* ----------------------- Otros helpers ----------------------- */
export function clearNoticiasCache() {
  try {
    if (IS_BROWSER && window.sessionStorage) {
      Object.keys(sessionStorage).forEach((k) => {
        if (k.startsWith("news:") || k.startsWith("newslive:") || k.startsWith("general:adapt:")) {
          sessionStorage.removeItem(k);
        }
      });
    }
  } catch {}
  memCache.clear();
}
export function proxifyMedia(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) {
    const base = String(API_BASE || "").replace(/\/+$/, "");
    return `${base}/media/proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

/* Reexport extractor de contenidos (tu archivo existente) */
export { getContenidoNoticia } from "./noticiasContenido.js";

/* Compatibilidad con imports antiguos */
export { getNoticiasRobust as getNoticias };
export { getNoticiasRobust as fetchNoticias };
export { getNoticiasRobust as getNoticiasLive };
export { API_BASE } from "./apiBase";
