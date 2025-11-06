// backend/routes/noticiasContenido.js
// ============================================================
// 🦉 BÚHOLEX | Extracción de contenido de noticia (robusto)
// - Cache en memoria + Cache-Control
// - Limpieza y saneado HTML (con imágenes, picture/source)
// - Absolutiza href/src/srcset/poster con base URL
// - Fallbacks: UA alterno, texto→HTML, extracción básica
// - Campos extra: title, bodyHtml, body, image, author, publishedAt, canonical
// - noCache=1 para saltar cache
// ============================================================
import { Router } from "express";
import { extract } from "@extractus/article-extractor";
import sanitizeHtml from "sanitize-html";
import NodeCache from "node-cache";
import crypto from "crypto";
import * as cheerio from "cheerio";

const router = Router();

/* -------------------- Cache en memoria (12h) -------------------- */
const TTL_SECONDS = 60 * 60 * 12; // 12h
const cache = new NodeCache({ stdTTL: TTL_SECONDS });

/* ---------------------------- Constantes ------------------------ */
const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36 BúhoLex";
const MOBILE_UA =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36 BúhoLex";

/* ------------------------------ Helpers ------------------------- */
const hashKey = (s) => crypto.createHash("md5").update(String(s)).digest("hex");

function stripTrackers(u = "") {
  try {
    const url = new URL(u);
    // limpia trackers comunes
    ["utm_source","utm_medium","utm_campaign","utm_term","utm_content","fbclid","gclid","mc_eid","mc_cid"].forEach(p=>url.searchParams.delete(p));
    url.hash = "";
    return url.toString();
  } catch { return String(u || ""); }
}

function pickLongest(arr = []) {
  return (arr || [])
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)[0] || "";
}

function paragraphsHtmlFromText(text = "") {
  const parts = String(text || "")
    .replace(/\r/g, "")
    .split(/\n{2,}/g)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length ? parts.map((p) => `<p>${p.replace(/\n+/g, " ")}</p>`).join("") : "";
}

function absolutizeUrl(u, base) {
  try {
    if (!u) return u;
    if (/^\/\//.test(u)) return "https:" + u;
    if (/^(#|mailto:|javascript:)/i.test(u)) return u;
    if (/^https?:\/\//i.test(u)) return u;
    return new URL(u, base).href;
  } catch { return u; }
}

function absolutizeSrcset(value, base) {
  try {
    if (!value) return value;
    return value
      .split(",")
      .map((s) => s.trim())
      .map((it) => {
        const [url, descriptor] = it.split(/\s+/, 2);
        const abs = absolutizeUrl(url, base);
        return descriptor ? `${abs} ${descriptor}` : abs;
      })
      .join(", ");
  } catch { return value; }
}

function absolutizeHtml(html, baseUrl) {
  if (!html || !baseUrl) return html;
  // href/src/data-src/poster
  html = html.replace(
    /\s(href|src|data-src|poster)\s*=\s*("(.*?)"|'(.*?)'|([^\s>]+))/gi,
    (_m, attr, _qv, dq, sq, nv) => {
      const raw = dq ?? sq ?? nv ?? "";
      const abs = absolutizeUrl(raw, baseUrl);
      const quoted = /"/.test(_qv || "") ? `"${abs}"` : `'${abs}'`;
      return ` ${attr}=${quoted}`;
    }
  );
  // srcset
  html = html.replace(/\ssrcset\s*=\s*("(.*?)"|'(.*?)')/gi, (_m, _qv, dq, sq) => {
    const raw = dq ?? sq ?? "";
    const abs = absolutizeSrcset(raw, baseUrl);
    const quoted = /"/.test(_qv || "") ? `"${abs}"` : `'${abs}'`;
    return ` srcset=${quoted}`;
  });
  return html;
}

const htmlToPlain = (html = "") => String(html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

function sanitize(html = "") {
  if (!html) return html;
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "img","figure","figcaption","blockquote","picture","source","video","audio"
    ]),
    allowedAttributes: {
      a: ["href","title","target","rel"],
      img: ["src","alt","title","width","height","srcset","sizes","loading"],
      source: ["src","srcset","type","sizes","media"],
      video: ["src","poster","controls","width","height"],
      audio: ["src","controls"],
      "*": ["style"]
    },
    transformTags: {
      a: (tagName, attribs) => ({
        tagName: "a",
        attribs: { ...attribs, target: "_blank", rel: "nofollow noopener noreferrer" },
      }),
      img: (tagName, attribs) => ({
        tagName: "img",
        attribs: { loading: "lazy", ...attribs },
      }),
    },
    allowedStyles: {
      "*": {
        "max-width": [/^\d+(%|px|vw)$/i],
        width: [/^\d+(%|px|vw)$/i],
        height: [/^\d+(%|px|vh)$/i],
        "object-fit": [/^(contain|cover|fill|none|scale-down)$/i],
        float: [/^(left|right|none)$/i],
      },
    },
  });
}

async function safeExtract(primaryUrl, { lang = "es" } = {}) {
  const url = stripTrackers(primaryUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  const headers = (ua) => ({
    "user-agent": ua,
    "accept-language": `${lang},${lang}-PE;q=0.9,en;q=0.8`,
    referer: url,
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  });

  try {
    // 1) desktop
    let art = await extract(url, { headers: headers(DESKTOP_UA), contentType: "html", signal: controller.signal });
    const weak = !art || (!art.content && !art.article && !art.body && !art.html && !art.textContent);
    // 2) mobile fallback
    if (weak) {
      art = await extract(url, { headers: headers(MOBILE_UA), contentType: "html", signal: controller.signal });
    }
    return art || {};
  } finally {
    clearTimeout(timeout);
  }
}

/** Fallback ultra-simple con cheerio cuando el extractor no trae casi nada */
function basicCheerioExtract(rawHtml = "", baseUrl = "") {
  if (!rawHtml) return {};
  const $ = cheerio.load(rawHtml);
  const title = $("meta[property='og:title']").attr("content")
    || $("title").text()
    || $("h1").first().text()
    || "";

  let main =
    $("article").first().html()
    || $("main").first().html()
    || $(".post-content,.entry-content,.content").first().html()
    || "";

  let img =
    $("meta[property='og:image']").attr("content")
    || $("img").first().attr("src")
    || "";

  const canonical = $("link[rel='canonical']").attr("href") || "";
  const date =
    $("meta[property='article:published_time']").attr("content")
    || $("time[datetime]").attr("datetime")
    || "";
  const author =
    $("meta[name='author']").attr("content")
    || $('[rel="author"]').text()
    || "";

  if (main) main = absolutizeHtml(main, baseUrl);
  if (img) img = absolutizeUrl(img, baseUrl);

  return { title, html: main, image: img, canonical: absolutizeUrl(canonical, baseUrl), date, author };
}

/* ============================= Route ============================== */
// GET /api/noticias/contenido?url=...&lang=es[&noCache=1]
router.get("/", async (req, res) => {
  try {
    let { url, lang = "es", noCache = "0" } = req.query;
    if (!url) return res.status(400).json({ error: "url requerida" });

    url = stripTrackers(url);
    const key = hashKey(`contenido:${lang}:${url}`);

    if (noCache !== "1") {
      const cached = cache.get(key);
      if (cached) {
        res.setHeader("Cache-Control", `public, max-age=${TTL_SECONDS}`);
        return res.json(cached);
      }
    }

    // 1) Intento con article-extractor (+UA fallback)
    const art = await safeExtract(url, { lang });

    // 2) Selección de campos
    const title =
      pickLongest([art?.title, art?.meta?.title, art?.og?.title, art?.twitter?.title, art?.tildes]) || "Sin título";

    const htmlCandidates = [art?.content, art?.article, art?.body, art?.html, art?.contentHTML, art?.textContentHTML];
    const textCandidates = [art?.textContent, art?.contentText, art?.text, art?.description, art?.excerpt, art?.meta?.description];

    let bodyHtml = pickLongest(htmlCandidates);
    let body = pickLongest(textCandidates);

    // imagen, autor, fecha, canonical (si vienen en meta)
    let image =
      art?.image || art?.cover || art?.og?.image || art?.twitter?.image || art?.meta?.image || "";
    let author = art?.author || art?.meta?.author || "";
    let publishedAt = art?.published || art?.date || art?.meta?.date || "";
    let canonical = art?.url || art?.resolved_url || art?.canonical || "";

    // 3) Si viene débil → intenta extracción simple con cheerio (solo GET si no hay html)
    if ((!bodyHtml || bodyHtml.length < 60) && (!body || body.length < 60)) {
      try {
        const raw = await fetch(url, { headers: { "user-agent": DESKTOP_UA, accept: "text/html" } }).then(r => r.text());
        const basic = basicCheerioExtract(raw, url);
        if (!title || title === "Sin título") author = basic.author || author;
        bodyHtml = bodyHtml?.length > 60 ? bodyHtml : basic.html || bodyHtml;
        image = image || basic.image || "";
        canonical = canonical || basic.canonical || "";
        publishedAt = publishedAt || basic.date || "";
      } catch { /* ignore */ }
    }

    // 4) Si no hay HTML pero sí texto → construir párrafos
    if ((!bodyHtml || bodyHtml.length < 60) && body) {
      bodyHtml = paragraphsHtmlFromText(body);
    }

    // 5) Absolutiza y sanea
    if (bodyHtml) {
      bodyHtml = absolutizeHtml(bodyHtml, url);
      bodyHtml = sanitize(bodyHtml);
    }
    if (!body && bodyHtml) body = htmlToPlain(bodyHtml);

    // 6) Fallback final
    if (!bodyHtml && !body) {
      const payload = { title, bodyHtml: "<p>Sin contenido.</p>", body: "", image: "", author: "", publishedAt: "", canonical: url };
      if (noCache !== "1") cache.set(key, payload);
      res.setHeader("Cache-Control", `public, max-age=${TTL_SECONDS}`);
      return res.json(payload);
    }

    // 7) Absolutiza imagen/canonical y fecha a ISO si se puede
    const imgAbs = image ? absolutizeUrl(image, url) : "";
    let publishedISO = null;
    try {
      if (publishedAt) {
        const d = new Date(publishedAt);
        if (!Number.isNaN(+d)) publishedISO = d.toISOString();
      }
    } catch { /* ignore */ }

    const payload = {
      title,
      bodyHtml,
      body,
      image: imgAbs,
      author: author || "",
      publishedAt: publishedISO || "",
      canonical: canonical ? absolutizeUrl(canonical, url) : url,
    };

    if (noCache !== "1") cache.set(key, payload);
    res.setHeader("Cache-Control", `public, max-age=${TTL_SECONDS}`);
    return res.json(payload);
  } catch (err) {
    console.error("❌ /api/noticias/contenido:", err?.message || err);
    return res.status(500).json({ error: "No se pudo extraer el contenido" });
  }
});

export default router;
