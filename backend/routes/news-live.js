// routes/newsLive.js
import { Router } from "express";
import { XMLParser } from "fast-xml-parser";

const router = Router();

// Parser XML (RSS/Atom/RDF)
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  textNodeName: "#text",
});

// Feeds (puedes agregar más claves cuando quieras)
const PROVIDERS = {
  elcomercio: "https://elcomercio.pe/feed/",
  rpp:        "https://rpp.pe/feed",
  elpais:     "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada",
  bbcmundo:   "https://feeds.bbci.co.uk/mundo/rss.xml",
  dw:         "https://rss.dw.com/rdf/rss-sp-all",
  reuters:    "https://feeds.reuters.com/reuters/topNews",
  ap:         "https://apnews.com/hub/ap-top-news?output=rss",
};

/* ----------------- Utilidades ----------------- */
const UA = "BuholexBot/1.0 (+https://buholex.com)";
const FETCH_TIMEOUT_MS = 10000;

function htmlToText(s = "") {
  return String(s)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function safeDateIso(input) {
  try {
    if (!input) return null;
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d.toISOString();
  } catch {
    return null;
  }
}

function firstNonEmpty(...vals) {
  for (const v of vals) {
    if (!v) continue;
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "object") {
      // RSS a veces manda { "#text": "..." }
      if (typeof v["#text"] === "string" && v["#text"].trim()) return v["#text"].trim();
      // Atom link { href: "..." }
      if (typeof v.href === "string" && v.href.trim()) return v.href.trim();
    }
  }
  return "";
}

function pickImage(item = {}) {
  // Soporte para distintos RSS/Atom
  const media = item["media:content"] || item["media:thumbnail"] || item.enclosure || {};
  const url = firstNonEmpty(media.url, item.image, item.thumbnail, item.picture);
  return /^https?:\/\//i.test(url) ? url : "";
}

function normalizeItem(raw = {}, fuente = "") {
  const titulo = firstNonEmpty(raw.title, raw["title"], raw["title"]?.["#text"]) || "(Sin título)";
  const enlace = firstNonEmpty(
    raw.link,
    raw.link?.href,
    raw.guid?.content,
    raw.guid?.["#text"]
  );
  const resumen = htmlToText(
    firstNonEmpty(
      raw.description,
      raw.description?.["#text"],
      raw.summary,
      raw.summary?.["#text"],
      raw.contentSnippet,
      raw.content
    )
  );
  const fecha = safeDateIso(
    firstNonEmpty(raw.pubDate, raw.updated, raw.published, raw.date)
  );
  const imagen = pickImage(raw);
  const fuenteNom = fuente;

  return { titulo, enlace, resumen, imagen, fuente: fuenteNom, fecha };
}

async function fetchRss(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new Error("timeout")), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, { headers: { "user-agent": UA }, signal: ctrl.signal });
    if (!res.ok) throw new Error(`RSS HTTP ${res.status}`);
    const xml = await res.text();
    const data = parser.parse(xml);

    // Soporta RSS 2.0, Atom y RDF
    if (Array.isArray(data?.rss?.channel?.item)) return data.rss.channel.item;
    if (Array.isArray(data?.feed?.entry)) return data.feed.entry;
    if (Array.isArray(data?.["rdf:RDF"]?.item)) return data["rdf:RDF"].item;

    // Caso único en array
    if (data?.rss?.channel?.item) return [data.rss.channel.item];
    if (data?.feed?.entry) return [data.feed.entry];
    if (data?.["rdf:RDF"]?.item) return [data["rdf:RDF"].item];

    return [];
  } finally {
    clearTimeout(timer);
  }
}

/* ----------------- Handler principal ----------------- */
router.get("/", async (req, res) => {
  try {
    let { q = "", lang = "all", providers = "", page = 1, limit = 12 } = req.query;

    // Normaliza providers seleccionados
    let keys = String(providers || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
      .filter((k) => k in PROVIDERS);

    // Defaults por idioma
    if (!keys.length) {
      keys = (lang === "en")
        ? ["reuters", "ap"]
        : ["elcomercio", "rpp", "elpais", "bbcmundo", "dw"];
    }

    // Descarga en paralelo con tolerancia a errores
    const settled = await Promise.allSettled(
      keys.map(async (k) => {
        const arr = await fetchRss(PROVIDERS[k]);
        return arr.map((it) => normalizeItem(it, k));
      })
    );

    // Junta y deduplica (por enlace o por título+fuente)
    const all = [];
    const seen = new Set();
    for (const s of settled) {
      if (s.status !== "fulfilled") continue;
      for (const it of s.value) {
        const key = it.enlace || `${it.titulo}#${it.fuente}`;
        if (!key || seen.has(key)) continue;
        if (it.enlace && !/^https?:\/\//i.test(it.enlace)) continue; // descarta links no http(s)
        seen.add(key);
        all.push(it);
      }
    }

    // Filtro por texto
    const needle = String(q || "").toLowerCase();
    const filtered = needle
      ? all.filter(
          (n) =>
            n.titulo?.toLowerCase().includes(needle) ||
            n.resumen?.toLowerCase().includes(needle) ||
            n.fuente?.toLowerCase().includes(needle)
        )
      : all;

    // Orden más reciente primero (si hay fecha ISO)
    filtered.sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));

    // Paginación
    const pg = Math.max(1, Number(page) || 1);
    const lim = Math.max(1, Number(limit) || 12);
    const start = (pg - 1) * lim;
    const slice = filtered.slice(start, start + lim);

    res.json({
      items: slice,
      pagination: {
        page: pg,
        limit: lim,
        total: filtered.length,
        pages: Math.ceil(filtered.length / lim),
        nextPage: start + lim < filtered.length ? pg + 1 : null,
        hasMore: start + lim < filtered.length,
      },
      filtros: {
        q,
        lang,
        providers: keys,
      },
    });
  } catch (err) {
    console.error("NEWS LIVE ERROR:", err);
    const msg = err?.name === "AbortError" ? "timeout" : err?.message || "unknown";
    res.status(500).json({ error: "news_live_failed", message: msg });
  }
});

export default router;
