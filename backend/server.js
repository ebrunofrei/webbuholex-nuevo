// server.js (ESM)
import express from "express";
import cors from "cors";
import axios from "axios";

const app = express();

/* ===============================
   🔧 CORS
================================= */
const allowedOrigins = [
  "http://localhost:5173",
  "https://buholex.com",
  "https://www.buholex.com",
  "https://buholex.vercel.app",
];
const allowedRegex = [/\.vercel\.app$/i, /\.railway\.app$/i];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (
        allowedOrigins.includes(origin) ||
        allowedRegex.some((r) => r.test(origin))
      ) {
        return cb(null, true);
      }
      return cb(new Error(`❌ CORS bloqueado para: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json());

/* ===============================
   ⚙️ Axios (UA + timeout)
================================= */
const http = axios.create({
  timeout: 10000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
    Accept: "application/json, text/plain, */*",
  },
});

/* ===============================
   🗄 Cache en memoria
================================= */
const memoryCache = new Map();
const CACHE_TTL = Number(process.env.CACHE_TTL || 600);

function getCache(key) {
  const hit = memoryCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return hit.data;
}
function setCache(key, data, ttl = CACHE_TTL) {
  memoryCache.set(key, { data, expiresAt: Date.now() + ttl * 1000 });
}

/* ===============================
   🔎 Normalizador
================================= */
function normalizeItems(arr = []) {
  if (!Array.isArray(arr)) return [];
  return arr.map((x, i) => ({
    id: x.id || x.url || `item-${i}-${Date.now()}`,
    titulo: x.title || x.name || "",
    enlace: x.url || x.link || "#",
    fuente: x.source?.name || x.source || x.publisher || "Desconocida",
    resumen: x.description || x.content || x.summary || "",
    fecha: x.publishedAt || x.date || x.pubDate || "",
    imagen: x.image || x.urlToImage || x.thumbnail || "",
  }));
}

async function fetchJsonFeed(url) {
  const { data } = await http.get(url);
  // Intentar detectar el array válido
  const arr =
    data?.articles ||
    data?.items ||
    data?.data ||
    (Array.isArray(data) ? data : []);
  return normalizeItems(arr);
}

/* ===============================
   🚦 Health
================================= */
app.get("/", (_req, res) => res.type("text/plain").send("ok"));
app.get("/api/health", (_req, res) =>
  res.json({ ok: true, now: new Date().toISOString() })
);

/* ===============================
   📰 Noticias generales
================================= */
app.get("/api/noticias", async (req, res) => {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.max(parseInt(req.query.limit || "8", 10), 1);
  const cacheKey = `general:${page}:${limit}`;

  try {
    const cached = getCache(cacheKey);
    if (cached) {
      res.set("Cache-Control", `public, max-age=60`);
      return res.json(cached);
    }

    const feedUrl =
      process.env.NEWS_GENERAL_FEED ||
      "https://newsdata.io/api/1/news?country=pe&language=es&apikey=demo";

    const items = await fetchJsonFeed(feedUrl);
    const start = (page - 1) * limit;
    const slice = items.slice(start, start + limit);

    const payload = { items: slice, hasMore: start + limit < items.length };
    setCache(cacheKey, payload);
    res.set("Cache-Control", `public, max-age=60`);
    res.json(payload);
  } catch (e) {
    console.error("❌ Noticias generales error:", e.message);
    res.set("Cache-Control", `no-store`);
    res.status(200).json({ items: [], hasMore: false });
  }
});

/* ===============================
   ⚖️ Noticias jurídicas
================================= */
app.get("/api/noticias-juridicas", async (req, res) => {
  const q = (req.query.q || "ley OR justicia OR judicial").toString();
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.max(parseInt(req.query.limit || "8", 10), 1);
  const cacheKey = `legal:${q}:${page}:${limit}`;

  try {
    const cached = getCache(cacheKey);
    if (cached) {
      res.set("Cache-Control", `public, max-age=60`);
      return res.json(cached);
    }

    const base =
      process.env.NEWS_LEGAL_FEED ||
      "https://newsdata.io/api/1/news?country=pe&language=es&q=";
    const feedUrl = `${base}${encodeURIComponent(q)}&apikey=demo`;

    const items = await fetchJsonFeed(feedUrl);
    const start = (page - 1) * limit;
    const slice = items.slice(start, start + limit);

    const payload = { items: slice, hasMore: start + limit < items.length };
    setCache(cacheKey, payload);
    res.set("Cache-Control", `public, max-age=60`);
    res.json(payload);
  } catch (e) {
    console.error("❌ Noticias jurídicas error:", e.message);
    res.set("Cache-Control", `no-store`);
    res.status(200).json({ items: [], hasMore: false });
  }
});

/* ===============================
   🖥 Arranque
================================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 API Noticias escuchando en 0.0.0.0:${PORT}`);
});
