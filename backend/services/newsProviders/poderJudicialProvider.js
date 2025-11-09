// ============================================================
// ?? BúhoLex | Provider Poder Judicial (gob.pe)
// Contrato: fetchNoticias({ q, page, limit, lang, since, especialidad })
// - Usa puppeteer-extra + stealth (tolerante a JS/render).
// - Extrae título, enlace, resumen, imagen, fecha.
// - Normaliza a tu formato (normalizeItem / normalizeNoticia).
// - Aplica filtros ligeros (q, since).
// - NO persiste en DB (que lo haga el orquestador/ingestor).
// ============================================================

import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import {
  normalizeItem,   // mismo helper que usas en otros providers
  proxifyMedia,
  toISODate,
  normalizeText,
  absUrl,
} from "./_helpers.js";
// Si en tu repo usas normalizeNoticia en lugar de normalizeItem, puedes importarlo
// import { normalizeNoticia as normalizeItem } from "./normalizer.js";

puppeteer.use(StealthPlugin());

// Despliegues tipo Railway/Render suelen requerir estas flags
const CHROME_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--no-zygote",
  "--disable-features=site-per-process",
];

const PJ_LIST_URL = "https://www.gob.pe/institucion/pj/noticias";

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 500;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight - 50) {
          clearInterval(timer);
          resolve();
        }
      }, 250);
    });
  });
}

function pickSrc($el) {
  // intenta data-src, src, srcset (primer recurso)
  const data = $el?.getAttribute?.("data-src") || "";
  const src = $el?.getAttribute?.("src") || "";
  const srcset = $el?.getAttribute?.("srcset") || "";
  if (data) return data;
  if (src) return src;
  if (srcset) {
    const first = srcset.split(",")[0]?.trim().split(" ")?.[0];
    if (first) return first;
  }
  return "";
}

function applySince(items, since) {
  if (!since) return items;
  const d = new Date(since);
  if (Number.isNaN(+d)) return items;
  return items.filter((n) => {
    const nf = new Date(n.fecha || 0);
    return !Number.isNaN(+nf) && nf >= d;
  });
}

function applyQ(items, q) {
  if (!q || !q.trim()) return items;
  const tok = q.toLowerCase();
  return items.filter(
    (n) =>
      String(n.titulo || "").toLowerCase().includes(tok) ||
      String(n.resumen || "").toLowerCase().includes(tok)
  );
}

async function fetchNoticias({
  q = "",
  page = 1,
  limit = 12,
  lang = "es",
  since = null,           // recomendado para “máx. 2 días”
  especialidad = "todas", // no se usa duro aquí; el front/back superior puede filtrar
} = {}) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: CHROME_ARGS,
    });
    const p = await browser.newPage();

    // UA y bloqueo de recursos pesados
    await p.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
    );
    await p.setRequestInterception(true);
    p.on("request", (req) => {
      const type = req.resourceType();
      if (type === "image" || type === "media" || type === "font") {
        // dejamos pasar algunas imágenes de portada para obtener src, pero en general bloqueamos
        // aquí bloqueamos todo por simplicidad (mejor desempeño en server)
        return req.abort();
      }
      req.continue();
    });

    // Navega
    await p.goto(PJ_LIST_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
    // Algunas tarjetas cargan con más scroll
    await autoScroll(p);
    await p.waitForSelector("a, article, .news-card, h3 a", { timeout: 20000 }).catch(() => {});

    // Extrae tarjetas: soporta varias variantes del portal
    const rawItems = await p.evaluate(() => {
      const out = [];

      // intenta recoger artículos en distintas estructuras
      const candidates = Array.from(
        document.querySelectorAll([
          "article",
          ".news-card",
          ".u-lis__item",
          ".container .row a[href*='/institucion/pj/noticias/']",
          "h3 a[href*='/institucion/pj/noticias/']",
        ].join(","))
      );

      for (const el of candidates) {
        let a = el.tagName === "A" ? el : el.querySelector("a[href]");
        if (!a) continue;
        const href = a.getAttribute("href") || "";
        if (!href || href === "#") continue;

        // título
        const tEl =
          el.querySelector("h3, h2, .article-title, .news-card__title, .u-lis__title") || a;
        const titulo = (tEl?.textContent || a.textContent || "").trim();

        // resumen (si lo hay)
        const rEl =
          el.querySelector("p, .article-excerpt, .summary, .news-card__summary");
        const resumen = (rEl?.textContent || "").trim();

        // imagen
        const imgEl = el.querySelector("img");
        let imagen = "";
        if (imgEl) {
          const trySrc =
            imgEl.getAttribute("data-src") ||
            imgEl.getAttribute("src") ||
            (imgEl.getAttribute("srcset") || "").split(",")[0]?.trim().split(" ")?.[0] ||
            "";
          imagen = trySrc || "";
        }

        // fecha dentro de la tarjeta (no siempre)
        const timeEl = el.querySelector("time, .date, .news-card__date");
        const fechaRaw = timeEl?.getAttribute?.("datetime") || timeEl?.textContent || "";

        out.push({
          titulo,
          enlace: href,
          resumen,
          imagen,
          fechaRaw,
        });
      }

      // dedupe por enlace
      const seen = new Set();
      return out.filter((n) => {
        const k = n.enlace;
        if (seen.has(k)) return false;
        seen.add(k);
        return n.titulo && n.enlace;
      });
    });

    // Normaliza
    let items = rawItems.map((n) => {
      const enlaceAbs = absUrl(n.enlace, "https://www.gob.pe");
      const imgAbs = n.imagen ? absUrl(n.imagen, enlaceAbs) : "";
      const fechaISO = toISODate(n.fechaRaw) || null;

      return normalizeItem({
        titulo: normalizeText(n.titulo),
        resumen: normalizeText(n.resumen || ""),
        enlace: enlaceAbs,
        imagen: imgAbs ? proxifyMedia(imgAbs) : "",
        fecha: fechaISO,
        fuente: "Poder Judicial",
        tipo: "juridica",
        especialidad: "administrativo", // etiqueta genérica; el front puede reclasificar por keywords
        lang: "es",
      });
    });

    // Filtros ligeros
    items = applySince(items, since);
    items = applyQ(items, q);

    // Ordena por fecha descendente
    items.sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));

    // Paginación
    const L = Math.max(1, Math.min(50, Number(limit) || 12));
    const P = Math.max(1, Number(page) || 1);
    const start = (P - 1) * L;
    const end = start + L;

    return items.slice(start, end);
  } catch (err) {
    console.error("? Provider Poder Judicial:", err?.message || err);
    return [];
  } finally {
    if (browser) {
      try { await browser.close(); } catch {}
    }
  }
}

export default fetchNoticias;
