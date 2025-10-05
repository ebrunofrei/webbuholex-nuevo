// Utilidades comunes para scrapers BúhoLex (ESM)

import axios from "axios";
import https from "https";

// Agente para webs con SSL quisquilloso
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// UA y headers por defecto
const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
  "Accept-Language": "es-PE,es;q=0.9,en;q=0.8",
  "Cache-Control": "no-cache",
};

/**
 * Descarga HTML de una URL (con timeout y headers)
 */
export async function fetchHTML(
  url,
  { timeout = 25000, headers = {} } = {}
) {
  const { data } = await axios.get(url, {
    timeout,
    httpsAgent,
    headers: { ...DEFAULT_HEADERS, ...headers },
    // aceptamos 3xx si los hay (algunas webs redirigen)
    validateStatus: (s) => s >= 200 && s < 400,
  });
  return data;
}

/**
 * Prueba varias URLs hasta que una responda (útil para mirrors)
 */
export async function tryFetchHTML(urls, opts = {}) {
  let lastErr;
  for (const u of urls) {
    try {
      return await fetchHTML(u, opts);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("Ninguna URL respondió correctamente.");
}

/**
 * Ejecuta una función async con reintentos
 */
export async function withRetry(fn, retries = 2, delay = 2000) {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt > retries) throw err;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

/**
 * Convierte URL relativa a absoluta respecto de un base
 */
export function absUrl(href, base) {
  if (!href) return null;
  try {
    return new URL(href, base).href;
  } catch {
    return href; // si ya es absoluta o es rara, la devolvemos igual
  }
}

// -------- RSS (parser cacheado) --------
let _parser = null;
async function getRSSParser() {
  if (_parser) return _parser;
  const mod = await import("rss-parser");
  const Parser = mod.default;
  _parser = new Parser({
    timeout: 20000,
    headers: DEFAULT_HEADERS,
  });
  return _parser;
}

/**
 * Lee un feed RSS y devuelve items normalizados básicos
 */
export async function fetchRSS(url, max = 10) {
  const parser = await getRSSParser();
  const feed = await parser.parseURL(url);
  const items = feed.items || [];
  return items.slice(0, max).map((i) => ({
    titulo: (i.title || "").trim(),
    resumen:
      (i.contentSnippet || i.content || "").toString().trim(),
    url: (i.link || "").trim(),
    fecha: i.isoDate || i.pubDate || null,
    fuente: feed.title || url,
    imagen: i.enclosure?.url || null,
  }));
}
