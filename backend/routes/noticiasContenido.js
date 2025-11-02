// backend/routes/noticiasContenido.js
import { Router } from "express";
import { extract } from "@extractus/article-extractor";
import sanitizeHtml from "sanitize-html";
import NodeCache from "node-cache";
import crypto from "crypto";

const router = Router();

// ─────────────────────────────────────────────────────────────
// Cache en memoria (12h) para evitar re-extracciones repetidas
// ─────────────────────────────────────────────────────────────
const cache = new NodeCache({ stdTTL: 60 * 60 * 12 }); // 12 horas

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36 BúhoLex";
const MOBILE_UA =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36 BúhoLex";

const hashKey = (s) => crypto.createHash("md5").update(String(s)).digest("hex");

function pickLongest(arr = []) {
  return (arr.filter(Boolean) || [])
    .map((x) => String(x).trim())
    .filter((x) => x.length > 0)
    .sort((a, b) => b.length - a.length)[0] || "";
}

function paragraphsHtmlFromText(text = "") {
  const parts = String(text || "")
    .replace(/\r/g, "")
    .split(/\n{2,}/g)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return "";
  return parts.map((p) => `<p>${p.replace(/\n+/g, " ")}</p>`).join("");
}

function absolutizeUrl(u, base) {
  try {
    if (!u) return u;
    if (/^\/\//.test(u)) return "https:" + u;                // //cdn → https://cdn
    if (/^(#|mailto:|javascript:)/i.test(u)) return u;        // anclas/esquemas no-http
    if (/^https?:\/\//i.test(u)) return u;                    // ya absoluto
    return new URL(u, base).href;                             // relativo → absoluto con base
  } catch {
    return u;
  }
}

function absolutizeSrcset(value, base) {
  try {
    if (!value) return value;
    const items = value.split(",").map((s) => s.trim());
    return items
      .map((it) => {
        const [url, descriptor] = it.split(/\s+/, 2);
        const abs = absolutizeUrl(url, base);
        return descriptor ? `${abs} ${descriptor}` : abs;
      })
      .join(", ");
  } catch {
    return value;
  }
}

function absolutizeHtml(html, baseUrl) {
  if (!html || !baseUrl) return html;

  // href / src / data-src / poster
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

const htmlToPlain = (html = "") =>
  String(html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

function sanitize(html = "") {
  if (!html) return html;
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "img",
      "figure",
      "figcaption",
      "blockquote",
      "picture",
      "source",
    ]),
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height", "srcset", "sizes", "loading"],
      source: ["srcset", "type", "sizes", "media"],
      "*": ["style"],
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

// extracción con timeout y fallback de UA
async function safeExtract(url, { lang = "es" } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15s

  try {
    let art = await extract(url, {
      headers: {
        "user-agent": DESKTOP_UA,
        "accept-language": `${lang},${lang}-PE;q=0.9,en;q=0.8`,
        referer: url,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      contentType: "html",
      signal: controller.signal,
    });

    const isWeak =
      !art ||
      (!art.content && !art.body && !art.article && !art.html && !art.textContent);

    if (isWeak) {
      art = await extract(url, {
        headers: {
          "user-agent": MOBILE_UA,
          "accept-language": `${lang},${lang}-PE;q=0.9,en;q=0.8`,
          referer: url,
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        contentType: "html",
        signal: controller.signal,
      });
    }

    return art || {};
  } finally {
    clearTimeout(timeout);
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/noticias/contenido?url=...&lang=es
// Respuesta: { title, bodyHtml, body }
// ─────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { url, lang = "es" } = req.query;
    if (!url) return res.status(400).json({ error: "url requerida" });

    const key = hashKey(`contenido:${lang}:${url}`);
    const cached = cache.get(key);
    if (cached) return res.json(cached);

    const art = await safeExtract(url, { lang });

    // ── Título ───────────────────────────────────────────────
    const title =
      pickLongest([
        art?.title,
        art?.meta?.title,
        art?.og?.title,
        art?.twitter?.title,
        art?.tildes,
      ]) || "Sin título";

    // ── Candidatos HTML/TEXTO ────────────────────────────────
    const htmlCandidates = [
      art?.content,
      art?.article,
      art?.body,
      art?.html,
      art?.contentHTML,
      art?.textContentHTML,
    ];

    const textCandidates = [
      art?.textContent,
      art?.contentText,
      art?.text,
      art?.description,
      art?.excerpt,
      art?.meta?.description,
    ];

    let bodyHtml = pickLongest(htmlCandidates);
    let body = pickLongest(textCandidates);

    // Si no hay HTML pero sí texto → construir HTML legible
    if ((!bodyHtml || bodyHtml.length < 60) && body) {
      bodyHtml = paragraphsHtmlFromText(body);
    }

    // Absolutizar rutas relativas y sanear
    if (bodyHtml) {
      bodyHtml = absolutizeHtml(bodyHtml, url);
      bodyHtml = sanitize(bodyHtml);
    }

    // Fallback final cuando llega todo vacío
    if (!bodyHtml && !body) {
      const payload = { title, bodyHtml: "<p>Sin contenido.</p>", body: "" };
      cache.set(key, payload);
      return res.json(payload);
    }

    // Si aún falta 'body' pero tenemos HTML → generar desde HTML saneado
    if (!body && bodyHtml) {
      body = htmlToPlain(bodyHtml);
    }

    const payload = { title, bodyHtml, body };
    cache.set(key, payload);
    res.json(payload);
  } catch (err) {
    console.error("❌ /api/noticias/contenido:", err?.message || err);
    res.status(500).json({ error: "No se pudo extraer el contenido" });
  }
});

export default router;
