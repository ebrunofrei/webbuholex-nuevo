import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";
import puppeteer from "puppeteer";
import { MongoClient } from "mongodb";

const router = express.Router();

// ====== CACHE MONGO + fallback memoria ======
const MONGO_URI = process.env.MONGO_URI || null;
const CACHE_DURATION = 60 * 20; // 20 minutos
let mongoDb = null;
let memoryCache = new Map();

if (MONGO_URI) {
  const client = new MongoClient(MONGO_URI);
  client.connect().then(() => {
    mongoDb = client.db("legalbot");
    console.log("✅ MongoDB conectado para cache");
  });
}

// ====== Configuración Puppeteer ======
const ENABLE_PUPPETEER = process.env.USE_PUPPETEER === "true" && !process.env.VERCEL;

// ====== Helpers ======
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; rv:118.0) Gecko/20100101 Firefox/118.0",
];
const randomUserAgent = () =>
  USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

async function tryWithRetries(fn, args = [], maxRetries = 2, delay = 1500) {
  let lastErr;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn(...args);
    } catch (err) {
      lastErr = err;
      if (i < maxRetries) {
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastErr;
}

// ====== SCRAPERS ======

// --- Legis.pe ---
async function scraperLegis(query) {
  const url = `https://legis.pe/?s=${encodeURIComponent(query)}`;
  const { data } = await axios.get(url, { headers: { "User-Agent": randomUserAgent() } });
  const $ = cheerio.load(data);
  return $("h2.entry-title > a").map((_, el) => ({
    titulo: $(el).text(),
    url: $(el).attr("href"),
    fuente: "legis.pe",
  })).get();
}

// --- Actualidad Legal ---
async function scraperActualidadLegal(query) {
  const url = `https://actualidadlegal.pe/?s=${encodeURIComponent(query)}`;
  const { data } = await axios.get(url, { headers: { "User-Agent": randomUserAgent() } });
  const $ = cheerio.load(data);
  return $("h2.entry-title > a").map((_, el) => ({
    titulo: $(el).text(),
    url: $(el).attr("href"),
    fuente: "actualidadlegal.pe",
  })).get();
}

// --- SPIJ (solo si Puppeteer habilitado) ---
async function scraperSPIJ(query) {
  if (!ENABLE_PUPPETEER) return [];
  let browser;
  const url = `https://spij.minjus.gob.pe/clpbuscador/busqueda/resultados?cadena=${encodeURIComponent(query)}`;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setUserAgent(randomUserAgent());
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    const html = await page.content();
    const $ = cheerio.load(html);

    const res = $(".res-tit").map((_, el) => {
      const titulo = $(el).text().trim();
      const link = $(el).find("a").attr("href");
      return titulo && link ? {
        titulo,
        url: link.startsWith("http") ? link : "https://spij.minjus.gob.pe" + link,
        fuente: "SPIJ",
      } : null;
    }).get();

    await browser.close();
    return res;
  } catch (err) {
    if (browser) await browser.close();
    console.error("❌ Error SPIJ:", err.message);
    return [];
  }
}

// --- El Peruano (solo si Puppeteer habilitado) ---
async function scraperElPeruano(query) {
  if (!ENABLE_PUPPETEER) return [];
  let browser;
  const url = `https://busquedas.elperuano.pe/?s=${encodeURIComponent(query)}`;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setUserAgent(randomUserAgent());
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    const html = await page.content();
    const $ = cheerio.load(html);

    const res = $("div#resultados article, div#resultados .resultado").map((_, el) => {
      const titulo =
        $(el).find("h2 a, h3 a").text().trim() ||
        $(el).find("h2, h3").text().trim();
      const link = $(el).find("h2 a, h3 a").attr("href") || "";
      const descripcion = $(el).find("p").text().trim();

      return titulo && link ? {
        titulo,
        url: link.startsWith("http") ? link : "https://busquedas.elperuano.pe" + link,
        descripcion,
        fuente: "elperuano.pe",
      } : null;
    }).get();

    await browser.close();
    return res;
  } catch (err) {
    if (browser) await browser.close();
    console.error("❌ Error El Peruano:", err.message);
    return [];
  }
}

// ====== ENDPOINT ======
router.post("/", async (req, res) => {
  const { consulta = "" } = req.body;
  if (!consulta.trim()) {
    return res.status(400).json({ ok: false, error: "Consulta requerida" });
  }

  const cacheKey = consulta.trim().toLowerCase();
  const now = Date.now();

  // 1. Revisa cache
  if (mongoDb) {
    const cache = await mongoDb.collection("legal_cache").findOne({ key: cacheKey });
    if (cache && now - cache.time < CACHE_DURATION * 1000) {
      return res.json({ ok: true, cache: true, total: cache.data.length, items: cache.data, hasMore: false });
    }
  } else if (memoryCache.has(cacheKey)) {
    const cache = memoryCache.get(cacheKey);
    if (now - cache.time < CACHE_DURATION * 1000) {
      return res.json({ ok: true, cache: true, total: cache.data.length, items: cache.data, hasMore: false });
    }
  }

  // 2. Selecciona scrapers según entorno
  let fuentes = [scraperLegis, scraperActualidadLegal];
  if (ENABLE_PUPPETEER) {
    fuentes.push(scraperSPIJ, scraperElPeruano);
    console.log("🟢 Scraping completo con Puppeteer habilitado");
  } else {
    console.log("⚠️ Puppeteer deshabilitado (modo Vercel)");
  }

  const resultados = await Promise.allSettled(fuentes.map(fn => fn(consulta)));

  let items = [];
  resultados.forEach(r => {
    if (r.status === "fulfilled" && Array.isArray(r.value)) {
      items = items.concat(r.value);
    }
  });

  // 3. Guarda cache
  if (mongoDb) {
    await mongoDb.collection("legal_cache").updateOne(
      { key: cacheKey },
      { $set: { key: cacheKey, data: items, time: now } },
      { upsert: true }
    );
  } else {
    memoryCache.set(cacheKey, { data: items, time: now });
  }

  // 4. Respuesta uniforme
  res.json({
    ok: true,
    cache: false,
    total: items.length,
    items,
    hasMore: false,
  });
});

export default router;
