import express from "express";
const router = express.Router();
import axios from "axios";
import * as cheerio from "cheerio";
import puppeteer from "puppeteer";
import {  MongoClient  } from "mongodb";

// ============ MongoDB CACHE =============
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const client = new MongoClient(MONGO_URI);
let db;
client.connect().then(() => {
  db = client.db("legalbot"); // Usa tu base preferida
  console.log("MongoDB conectado para cache");
});
const CACHE_DURATION = 60 * 20; // 20 minutos en segundos

// ============ Scraping helpers ============
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:118.0) Gecko/20100101 Firefox/118.0",
];
function randomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}
function withTimeout(promise, ms = 20000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout scraping')), ms)),
  ]);
}
async function tryWithRetries(scraperFn, args = [], maxRetries = 2, delay = 1500) {
  let lastErr;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await scraperFn(...args);
    } catch (err) {
      lastErr = err;
      if (i < maxRetries) await new Promise(r => setTimeout(r, delay + Math.random() * 1000));
    }
  }
  throw lastErr;
}

// ============ SCRAPERS =============

// --- legis.pe ---
async function scraperLegis(query) {
  const searchUrl = `https://legis.pe/?s=${encodeURIComponent(query)}`;
  const { data } = await axios.get(searchUrl, {
    headers: { "User-Agent": randomUserAgent() }
  });
  const $ = cheerio.load(data);
  let resultado = [];
  $("h2.entry-title > a").each((_, el) => {
    resultado.push({
      titulo: $(el).text(),
      url: $(el).attr("href"),
      fuente: "legis.pe"
    });
  });
  return resultado;
}
async function buscarEnLegis(query) {
  return withTimeout(tryWithRetries(scraperLegis, [query], 2), 20000);
}

// --- Actualidad Legal ---
async function scraperActualidadLegal(query) {
  const url = `https://actualidadlegal.pe/?s=${encodeURIComponent(query)}`;
  const { data } = await axios.get(url, {
    headers: { "User-Agent": randomUserAgent() }
  });
  const $ = cheerio.load(data);
  let resultado = [];
  $("h2.entry-title > a").each((_, el) => {
    resultado.push({
      titulo: $(el).text(),
      url: $(el).attr("href"),
      fuente: "actualidadlegal.pe"
    });
  });
  return resultado;
}
async function buscarEnActualidadLegal(query) {
  return withTimeout(tryWithRetries(scraperActualidadLegal, [query], 2), 20000);
}

// --- SPIJ (Puppeteer) ---
async function scraperSPIJ(query) {
  let browser;
  const searchUrl = `https://spij.minjus.gob.pe/clpbuscador/busqueda/resultados?cadena=${encodeURIComponent(query)}`;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const page = await browser.newPage();
    await page.setUserAgent(randomUserAgent());
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForSelector(".res-tit", { timeout: 12000 }).catch(() => {});
    const html = await page.content();
    const $ = cheerio.load(html);
    let resultado = [];
    $(".res-tit").each((i, el) => {
      const titulo = $(el).text().trim();
      const url = $(el).find("a").attr("href") || "";
      if (titulo && url) {
        resultado.push({
          titulo,
          url: url.startsWith("http") ? url : "https://spij.minjus.gob.pe" + url,
          fuente: "SPIJ"
        });
      }
    });
    await browser.close();
    return resultado;
  } catch (err) {
    if (browser) await browser.close();
    throw err;
  }
}
async function buscarEnSPIJ(query) {
  return withTimeout(tryWithRetries(scraperSPIJ, [query], 2), 20000);
}

// --- El Peruano (Puppeteer) ---
async function scraperElPeruano(query) {
  let browser;
  const searchUrl = `https://busquedas.elperuano.pe/?s=${encodeURIComponent(query)}`;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const page = await browser.newPage();
    await page.setUserAgent(randomUserAgent());
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForSelector("div#resultados", { timeout: 15000 }).catch(() => {});
    const html = await page.content();
    const $ = cheerio.load(html);
    let resultado = [];
    $("div#resultados article, div#resultados .resultado").each((i, el) => {
      const titulo = $(el).find("h2 a, h3 a").text().trim() || $(el).find("h2, h3").text().trim();
      const url = $(el).find("h2 a, h3 a").attr("href") || "";
      const descripcion = $(el).find("p").text().trim();
      if (titulo && url) {
        resultado.push({
          titulo,
          url: url.startsWith("http") ? url : "https://busquedas.elperuano.pe" + url,
          descripcion,
          fuente: "elperuano.pe"
        });
      }
    });
    await browser.close();
    return resultado;
  } catch (err) {
    if (browser) await browser.close();
    throw err;
  }
}
async function buscarEnElPeruano(query) {
  return withTimeout(tryWithRetries(scraperElPeruano, [query], 2), 20000);
}

// ============ ENDPOINT PRINCIPAL =============
router.post("/", async (req, res) => {
  const { consulta } = req.body;
  const cacheKey = consulta.trim().toLowerCase();
  const now = Date.now();

  // --- 1. Busca en caché Mongo ---
  let cacheDoc = null;
  if (db) {
    cacheDoc = await db.collection("legal_cache").findOne({ key: cacheKey });
    if (cacheDoc && (now - cacheDoc.time < CACHE_DURATION * 1000)) {
      return res.json({ resultado: cacheDoc.data });
    }
  }

  // --- 2. Scrapea en paralelo fuentes ---
  let resultado = [];
  const fuentes = [
    { nombre: "legis.pe", fn: buscarEnLegis },
    { nombre: "actualidadlegal.pe", fn: buscarEnActualidadLegal },
    { nombre: "SPIJ", fn: buscarEnSPIJ },
    { nombre: "elperuano.pe", fn: buscarEnElPeruano }
  ];

  const resultados = await Promise.allSettled(
    fuentes.map(f => f.fn(consulta))
  );
  resultados.forEach((res, idx) => {
    if (res.status === "fulfilled" && Array.isArray(res.value)) {
      resultado = resultado.concat(res.value);
    }
    // Puedes loggear res.reason para monitoreo si quieres
  });

  // --- 3. Guarda en caché Mongo ---
  if (db) {
    await db.collection("legal_cache").updateOne(
      { key: cacheKey },
      { $set: { key: cacheKey, data: resultado, time: now } },
      { upsert: true }
    );
  }

  res.json({ resultado });
});

export default router;
