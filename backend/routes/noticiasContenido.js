import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";
import sanitizeHtml from "sanitize-html";
import NodeCache from "node-cache";
import puppeteer from "puppeteer";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import chalk from "chalk";

const router = express.Router();
const cache = new NodeCache({ stdTTL: 3600 }); // Cache TTL de 1 hora

// ---------- Utilidades ----------

/**
 * Función para hacer scroll infinito en una página utilizando Puppeteer
 * @param {puppeteer.Page} page - Instancia de la página de Puppeteer
 */
async function autoScroll(page) {
  await page.evaluate(() => {
    return new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 600;
      const timer = setInterval(() => {
        const { scrollHeight } = document.body;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight - window.innerHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 200);
    });
  });
}

/**
 * Función para sanear texto eliminando etiquetas HTML.
 * @param {string} text - Texto a sanitizar
 * @returns {string} - Texto sanitizado
 */
function sanitizeText(text) {
  return sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Función para extraer información estructurada de JSON-LD.
 * @param {cheerio.CheerioAPI} $ - Instancia de cheerio
 * @returns {Object|null} - Objeto con el título y cuerpo extraído o null
 */
function extractFromJsonLd($) {
  const blocks = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $(el).contents().text();
      const json = JSON.parse(raw);
      const arr = Array.isArray(json) ? json : [json];
      arr.forEach((obj) => {
        if (obj && (obj["@type"] === "NewsArticle" || obj["@type"] === "Article")) {
          blocks.push({
            title: obj.headline || obj.name || "",
            body: obj.articleBody || "",
          });
        }
      });
    } catch (_) {}
  });
  if (blocks.length) {
    const best = blocks.sort((a, b) => (b.body?.length || 0) - (a.body?.length || 0))[0];
    if (best.body && best.body.length > 200) {
      return { title: best.title || "Sin título", body: best.body };
    }
  }
  return null;
}

/**
 * Función para extraer el contenido utilizando la librería Readability.
 * @param {string} html - HTML de la página
 * @param {string} url - URL de la página
 * @returns {Object|null} - Objeto con el título y cuerpo extraído o null
 */
function extractWithReadability(html, url) {
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();
  if (article && article.textContent && article.textContent.trim().length > 200) {
    return { title: article.title || "Sin título", body: article.textContent };
  }
  return null;
}

/**
 * Función para extraer contenido utilizando Cheerio.
 * @param {string} html - HTML de la página
 * @returns {Object|null} - Objeto con el título y cuerpo extraído o null
 */
function extractWithCheerio(html) {
  const $ = cheerio.load(html);
  const ld = extractFromJsonLd($);
  if (ld) return ld;

  $("script, style, nav, header, footer, iframe, svg, noscript").remove();

  const title =
    $("h1").first().text().trim() ||
    $("meta[property='og:title']").attr("content") ||
    $("title").text().trim() ||
    "Sin título";

  let container =
    $("article").first() ||
    $("div[itemprop='articleBody']").first() ||
    $("section[class*='content']").first() ||
    $("div[class*='article']").first() ||
    $("main").first();

  if (!container || container.length === 0) container = $("body");

  const paragraphs = container
    .find("p")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(
      (p) =>
        p &&
        p.length > 40 &&
        !/^Por\s/i.test(p) &&
        !/^Publicado/i.test(p) &&
        !/(©|Copyright|Autor)/i.test(p)
    );

  const body = paragraphs.join("\n\n");
  if (body && body.length > 200) {
    return { title, body };
  }
  return null;
}

// ---------- Descarga HTML ----------

/**
 * Función para obtener HTML usando Axios.
 * @param {string} url - URL de la página
 * @returns {Promise<string>} - HTML de la página
 */
async function fetchHtmlAxios(url) {
  const { data } = await axios.get(url, {
    timeout: 20000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!data || data.length < 500) throw new Error("HTML vacío/bloqueado");
  return data;
}

/**
 * Función para obtener HTML usando Puppeteer.
 * @param {string} url - URL de la página
 * @returns {Promise<{html: string, pre: Object|null}>} - HTML de la página y contenido procesado
 */
async function fetchHtmlPuppeteer(url) {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    await page.setViewport({ width: 1366, height: 900 });
    await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });

    await page.waitForSelector("article, main, p", { timeout: 12000 }).catch(() => {});
    await autoScroll(page);

    const direct = await page.evaluate(() => {
      const pick = (...sels) => sels.map((s) => document.querySelector(s)).find(Boolean);
      const t =
        document.querySelector("h1")?.innerText?.trim() ||
        document.querySelector("meta[property='og:title']")?.getAttribute("content") ||
        document.title ||
        "Sin título";

      const containers =
        [
          "article",
          "main",
          "div[itemprop='articleBody']",
          "section[class*='content']",
          "div[class*='article']",
        ]
          .map((s) => Array.from(document.querySelectorAll(s)))
          .flat() || [];

      let paras = [];
      const take = (root) => {
        if (!root) return;
        const ps = Array.from(root.querySelectorAll("p"))
          .map((p) => p.innerText.trim())
          .filter(
            (x) =>
              x &&
              x.length > 40 &&
              !/^Por\s/i.test(x) &&
              !/^Publicado/i.test(x) &&
              !/(©|Copyright|Autor)/i.test(x)
          );
        paras.push(...ps);
      };

      if (containers.length) containers.forEach(take);
      if (paras.length < 5) {
        const ps = Array.from(document.querySelectorAll("p")).map((p) => p.innerText.trim());
        paras.push(
          ...ps.filter(
            (x) =>
              x &&
              x.length > 40 &&
              !/^Por\s/i.test(x) &&
              !/^Publicado/i.test(x) &&
              !/(©|Copyright|Autor)/i.test(x)
          )
        );
      }

      const joined = paras.join("\n\n");
      return { title: t, body: joined, ok: joined.length > 200 };
    });

    if (direct && direct.ok) {
      return { html: await page.content(), pre: { title: direct.title, body: direct.body } };
    }

    return { html: await page.content(), pre: null };
  } finally {
    await browser.close();
  }
}

// ---------- Endpoint ----------

router.get("/", async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "Falta parámetro url" });

    const cached = cache.get(url);
    if (cached) return res.json({ cached: true, ...cached });

    let html;
    let preExtract = null;

    try {
      html = await fetchHtmlAxios(url);
    } catch {
      const { html: h, pre } = await fetchHtmlPuppeteer(url);
      html = h;
      preExtract = pre;
    }

    if (preExtract && preExtract.body && preExtract.body.length > 200) {
      const payload = { title: preExtract.title || "Sin título", body: sanitizeText(preExtract.body) };
      cache.set(url, payload);
      return res.json({ cached: false, ...payload });
    }

    const r = extractWithReadability(html, url);
    if (r && r.body && r.body.length > 200) {
      const payload = { title: r.title, body: sanitizeText(r.body) };
      cache.set(url, payload);
      return res.json({ cached: false, ...payload });
    }

    const c = extractWithCheerio(html);
    if (c && c.body && c.body.length > 200) {
      const payload = { title: c.title, body: sanitizeText(c.body) };
      cache.set(url, payload);
      return res.json({ cached: false, ...payload });
    }

    throw new Error("Contenido insuficiente");
  } catch (err) {
    console.error("❌ contenido:", err.message);
    res.status(500).json({ error: "No se pudo extraer contenido" });
  }
});

export default router;
