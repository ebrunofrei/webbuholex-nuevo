// ============================================================
// ?? BúhoLex | Provider Gaceta Jurídica
// Contrato: async function fetchNoticias({ q, page, limit, lang, since, especialidad })
// - Intenta primero scrape estático (cheerio).
// - Si falla (cero items) y ENABLE_PUPPETEER=1 ? usa Puppeteer con flags Railway.
// - Devuelve items normalizados (normalizeItem).
// ============================================================

import * as cheerio from "cheerio";
import {
  fetchHTML,
  absUrl,
  normalizeText,
  toISODate,
  proxifyMedia,
  normalizeItem,
} from "./_helpers.js";

const BASE = "https://gacetajuridica.com.pe";
const LIST_URL =
  `${BASE}/productos/gaceta-constitucional/noticias-informes-opiniones/categorias/noticias`;

/**
 * Extrae items del HTML de listado (cheerio)
 */
function parseStaticList(html) {
  const $ = cheerio.load(html);
  const items = [];

  // Selectores amplios por variaciones de layout
  const cards = $("article, .item.noticia, .views-row, .noticia, .news-item");

  cards.each((_, el) => {
    const $el = $(el);

    // título + enlace (evita anchors vacíos)
    const $a = $el
      .find("h3 a, h2 a, .titulo a, a[href]")
      .filter((i, a) => {
        const h = $(a).attr("href") || "";
        return h && h !== "#";
      })
      .first();

    const titulo = normalizeText($a.text());
    const href = $a.attr("href") || "";
    const enlace = absUrl(href, BASE);
    if (!titulo || !enlace) return;

    // resumen
    const resumen = normalizeText(
      $el.find("p").first().text() ||
      $el.find(".resumen, .summary, .extracto").first().text() ||
      ""
    );

    // fecha (si aparece)
    const rawFecha =
      $el.find("time").attr("datetime") ||
      normalizeText($el.find(".fecha, .date").first().text() || "");
    const fecha = toISODate(rawFecha);

    // imagen (evitar svg o placeholders)
    const rawImg =
      $el.find("img").attr("data-src") || $el.find("img").attr("src") || "";
    const absImg = absUrl(rawImg, BASE);
    const imagen = absImg && !/\.svg(\?|$)/i.test(absImg) ? proxifyMedia(absImg) : "";

    items.push(
      normalizeItem({
        titulo,
        resumen,
        enlace,
        imagen,
        fecha,
        fuente: "Gaceta Jurídica",
        tipo: "juridica",
        // la especialidad la determinamos por texto en el backend/cliente
        lang: "es",
      })
    );
  });

  return items;
}

/**
 * Fallback con Puppeteer (opcional)
 */
async function parseWithPuppeteer({ page = 1, limit = 12 } = {}) {
  // Se activa solo si existe ENABLE_PUPPETEER=1
  if (process.env.ENABLE_PUPPETEER !== "1") return [];

  let browser;
  try {
    const puppeteer = await import("puppeteer");
    browser = await puppeteer.default.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--single-process",
      ],
      // En Railway, a veces requiere executablePath si usas Chrome empaquetado.
      // executablePath: process.env.CHROME_BIN || undefined,
    });

    const p = await browser.newPage();
    await p.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/118 Safari/537.36"
    );
    await p.goto(LIST_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
    await p.waitForSelector("article, .item.noticia, .views-row", { timeout: 15000 }).catch(() => {});

    const raw = await p.$$eval(
      "article, .item.noticia, .views-row, .noticia, .news-item",
      (els) =>
        els.map((el) => {
          const pick = (sel) => el.querySelector(sel);
          const pickText = (sel) => pick(sel)?.innerText?.trim() || "";
          const pickAttr = (sel, attr) => pick(sel)?.getAttribute(attr) || "";

          const a = pick("h3 a, h2 a, .titulo a, a[href]");
          const href = a?.getAttribute("href") || "";
          const titulo = (a?.textContent || "").trim();

          const resumen =
            pickText("p") ||
            pickText(".resumen, .summary, .extracto");

          const rawFecha =
            pickAttr("time", "datetime") ||
            (pick(".fecha, .date")?.textContent?.trim() || "");

          let rawImg =
            pickAttr("img", "data-src") || pickAttr("img", "src") || "";
          return { href, titulo, resumen, rawFecha, rawImg };
        })
    );

    const items = raw
      .filter((r) => r.titulo && r.href)
      .map((r) =>
        normalizeItem({
          titulo: r.titulo,
          resumen: r.resumen || "",
          enlace: new URL(r.href, LIST_URL).href,
          imagen:
            r.rawImg && !/\.svg(\?|$)/i.test(r.rawImg)
              ? new URL(r.rawImg, LIST_URL).href
              : "",
          fecha: r.rawFecha || "",
          fuente: "Gaceta Jurídica",
          tipo: "juridica",
          lang: "es",
        })
      );

    // Orden y recorte
    items.sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
    const L = Math.max(1, Math.min(50, Number(limit) || 12));
    return items.slice(0, L);
  } catch (e) {
    console.warn("Gaceta (Puppeteer) error:", e?.message || e);
    return [];
  } finally {
    if (browser) await browser.close();
  }
}

async function fetchNoticias({
  q = "",
  page = 1,
  limit = 12,
  lang = "all",
  since = null,
  // especialidad = "", // lo podemos inferir por texto en otra capa
} = {}) {
  try {
    // 1) intento estático
    const html = await fetchHTML(LIST_URL, { timeout: 20000 });
    let items = html ? parseStaticList(html) : [];

    // 2) fallback opcional con puppeteer
    if (items.length === 0) {
      const fromBrowser = await parseWithPuppeteer({ page, limit });
      items = fromBrowser;
    }

    // 3) filtrar por 'since' (si llega)
    if (since) {
      const d = new Date(since);
      if (!Number.isNaN(+d)) {
        items = items.filter((n) => {
          const nf = new Date(n.fecha || 0);
          return !Number.isNaN(+nf) && nf >= d;
        });
      }
    }

    // 4) búsqueda simple por q (título/resumen)
    if (q && q.trim()) {
      const tok = q.toLowerCase();
      items = items.filter(
        (n) =>
          String(n.titulo || "").toLowerCase().includes(tok) ||
          String(n.resumen || "").toLowerCase().includes(tok)
      );
    }

    // 5) ordenar y limitar
    items.sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
    const L = Math.max(1, Math.min(50, Number(limit) || 12));
    return items.slice(0, L);
  } catch (err) {
    console.error("? Gaceta Jurídica:", err?.message || err);
    return [];
  }
}

export default fetchNoticias;
