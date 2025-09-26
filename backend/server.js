import express from "express";
import cors from "cors";
import axios from "axios";

const app = express();

// ===============================
// 🔧 Configuración CORS
// ===============================
const allowedOrigins = [
  "http://localhost:5173",     // Desarrollo local
  "https://buholex.com",       // Producción
  "https://www.buholex.com",   // Producción con www
  "https://buholex.vercel.app" // Vercel
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // server2server / Postman
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`❌ CORS bloqueado para: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json());

// ===============================
// 🗄 Cache en memoria
// ===============================
const memoryCache = new Map();
const CACHE_TTL = Number(process.env.CACHE_TTL || 600); // 10 min por defecto

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

// ===============================
// 📦 Normalizador
// ===============================
function normalizeItems(arr = []) {
  return arr.map((x, i) => ({
    id: x.id || x.url || `item-${i}-${Date.now()}`,
    titulo: x.title || x.name || "",
    enlace: x.url || "#",
    fuente: x.source?.name || x.source || x.publisher || "Desconocida",
    resumen: x.description || x.content || "",
    fecha: x.publishedAt || x.date || "",
    imagen: x.image || x.urlToImage || "",
  }));
}

async function fetchFeed(url) {
  const { data } = await axios.get(url, { timeout: 10000 });
  const items = normalizeItems(
    data?.articles || data?.items || data?.data || []
  );
  return items;
}

// ===============================
// 🚀 Endpoints
// ===============================

// Salud
app.get("/api/health", (req, res) => {
  res.json({ ok: true, now: new Date().toISOString() });
});

// Noticias generales
app.get("/api/noticias", async (req, res) => {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.max(parseInt(req.query.limit || "8", 10), 1);
  const cacheKey = `general:${page}:${limit}`;

  try {
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    const feedUrl =
      process.env.NEWS_GENERAL_FEED ||
      "https://gnews.io/api/v4/top-headlines?lang=es&country=pe&max=50&apikey=demo";

    const items = await fetchFeed(feedUrl);
    const start = (page - 1) * limit;
    const slice = items.slice(start, start + limit);

    const payload = { items: slice, hasMore: start + limit < items.length };
    setCache(cacheKey, payload);
    res.json(payload);
  } catch (e) {
    console.error("❌ Noticias generales error:", e.message);
    res.status(200).json({ items: [], hasMore: false });
  }
});

// Noticias jurídicas
app.get("/api/noticias-juridicas", async (req, res) => {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.max(parseInt(req.query.limit || "8", 10), 1);
  const cacheKey = `legal:${page}:${limit}`;

  try {
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    const feedUrl =
      process.env.NEWS_LEGAL_FEED ||
      "https://gnews.io/api/v4/search?q=ley%20OR%20justicia%20OR%20judicial&lang=es&country=pe&max=50&apikey=demo";

    const items = await fetchFeed(feedUrl);
    const start = (page - 1) * limit;
    const slice = items.slice(start, start + limit);

    const payload = { items: slice, hasMore: start + limit < items.length };
    setCache(cacheKey, payload);
    res.json(payload);
  } catch (e) {
    console.error("❌ Noticias jurídicas error:", e.message);
    res.status(200).json({ items: [], hasMore: false });
  }
});

// ===============================
// 🖥 Start server
// ===============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API Noticias corriendo en puerto ${PORT}`);
});
