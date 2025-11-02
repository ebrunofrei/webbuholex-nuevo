// backend/routes/traducir.js
import express from "express";
import axios from "axios";
import NodeCache from "node-cache";
import crypto from "crypto";
import OpenAI from "openai";

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// Cache 24h
// ─────────────────────────────────────────────────────────────
const cache = new NodeCache({ stdTTL: 60 * 60 * 24 });

// ─────────────────────────────────────────────────────────────
// OpenAI opcional
// ─────────────────────────────────────────────────────────────
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// ─────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────
const TIMEOUT_MS = Number(process.env.TRANSLATE_TIMEOUT_MS || 12000);
const MAX_CHUNK = Number(process.env.TRANSLATE_MAX_CHUNK || 3800);
const MAX_TOTAL = Number(process.env.TRANSLATE_MAX_TOTAL || 24000);
const OPENAI_MODEL = process.env.OPENAI_TRANSLATE_MODEL || "gpt-4.1-mini";

const LIBRE_ENDPOINTS = [
  process.env.LIBRETRANSLATE_URL || "https://libretranslate.com",
  // Puedes añadir más mirrors por ENV separados por coma y hacer push aquí.
];

// ─────────────────────────────────────────────────────────────
// Utils
// ─────────────────────────────────────────────────────────────
const isProbablyHtml = (t = "") => /<[^>]+>/.test(String(t));

const normalizeLang = (s = "es") => {
  const m = String(s || "es").toLowerCase().replace("_", "-");
  if (m.startsWith("es")) return "es";
  if (m.startsWith("en")) return "en";
  if (m.startsWith("pt")) return "pt";
  if (m.startsWith("fr")) return "fr";
  if (m.startsWith("de")) return "de";
  if (m.startsWith("it")) return "it";
  return "es";
};

function splitChunks(text, size = MAX_CHUNK) {
  const t = String(text ?? "").slice(0, MAX_TOTAL);
  const out = [];
  for (let i = 0; i < t.length; i += size) out.push(t.slice(i, i + size));
  return out;
}

function cacheKeyFor(text, targetLang) {
  return crypto
    .createHash("md5")
    .update(`${normalizeLang(targetLang)}::${text}`)
    .digest("hex");
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function withRetries(fn, { tries = 2, baseDelay = 350 } = {}) {
  let lastErr = null;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < tries - 1) await sleep(baseDelay * (i + 1));
    }
  }
  throw lastErr;
}

// ─────────────────────────────────────────────────────────────
// Proveedor: LibreTranslate
// ─────────────────────────────────────────────────────────────
async function translateWithLibre(fullText, targetLang = "es") {
  const chunks = splitChunks(fullText);
  const translatedParts = [];
  const html = isProbablyHtml(fullText);

  const translateChunk = async (part) => {
    let translatedChunk = null;

    for (const base of LIBRE_ENDPOINTS) {
      const url = `${base.replace(/\/+$/, "")}/translate`;
      try {
        const res = await axios.post(
          url,
          {
            q: part,
            source: "auto",
            target: normalizeLang(targetLang),
            format: html ? "html" : "text",
          },
          { timeout: TIMEOUT_MS }
        );
        if (res?.data?.translatedText) {
          translatedChunk = res.data.translatedText;
          break;
        }
      } catch {
        // probar siguiente mirror
      }
    }

    if (!translatedChunk) throw new Error("LibreTranslate no disponible");
    return translatedChunk;
  };

  for (const part of chunks) {
    const translated = await withRetries(
      () => translateChunk(part),
      { tries: 3, baseDelay: 400 }
    );
    translatedParts.push(translated);
  }

  return html ? translatedParts.join("") : translatedParts.join("\n");
}

// ─────────────────────────────────────────────────────────────
// Proveedor: OpenAI (Responses API)
// ─────────────────────────────────────────────────────────────
async function translateWithOpenAI(fullText, targetLang = "es") {
  if (!openai) throw new Error("OpenAI no configurado");
  const chunks = splitChunks(fullText, Math.min(3500, MAX_CHUNK));
  const translatedParts = [];
  const html = isProbablyHtml(fullText);

  for (const part of chunks) {
    const prompt = html
      ? `Traduce al ${normalizeLang(
          targetLang
        )} de forma fiel y neutra el siguiente HTML, sin resumir ni reescribir; respeta etiquetas y estructura:\n\n${part}`
      : `Traduce al ${normalizeLang(
          targetLang
        )} de manera fiel, clara y neutra, sin resumir ni añadir contenido:\n\n${part}`;

    const resp = await openai.responses.create({
      model: OPENAI_MODEL,
      input: prompt,
      // temperature: 0.2,
    });

    let text = resp?.output_text;
    if (!text) {
      try {
        const c = resp?.output?.[0]?.content?.[0];
        text = c?.text ?? "";
      } catch {}
    }
    if (!text) throw new Error("OpenAI devolvió vacío");

    translatedParts.push(text.trim());
  }

  return html ? translatedParts.join("") : translatedParts.join("\n");
}

// ─────────────────────────────────────────────────────────────
// Proveedor: MyMemory (tercer fallback gratuito)
// ─────────────────────────────────────────────────────────────
async function translateWithMyMemory(fullText, targetLang = "es") {
  const chunks = splitChunks(fullText, 1400); // API cortita
  const out = [];
  const html = isProbablyHtml(fullText); // MyMemory no respeta HTML, mejor enviar texto si fuese HTML

  for (const part of chunks) {
    const q = html ? part.replace(/<[^>]+>/g, " ") : part; // proteger etiquetas
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      q
    )}&langpair=${encodeURIComponent("auto|" + normalizeLang(targetLang))}`;

    const r = await axios.get(url, { timeout: TIMEOUT_MS });
    const translated = r?.data?.responseData?.translatedText || "";
    if (!translated) throw new Error("MyMemory vacío");
    out.push(translated);
  }

  // devolvemos texto plano (el frontend lo convertirá a HTML si hace falta)
  return out.join(" ");
}

// ─────────────────────────────────────────────────────────────
// POST /api/traducir
// body: { text, targetLang? }
// ─────────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { text, targetLang = "es" } = req.body || {};
    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "Falta texto" });
    }

    const key = cacheKeyFor(text, targetLang);
    const cached = cache.get(key);
    if (cached) {
      return res.json({ cached: true, translated: cached, provider: "cache" });
    }

    let translated = "";
    let provider = "libre";
    let lastError = null;

    // 1) LibreTranslate
    try {
      translated = await translateWithLibre(text, targetLang);
    } catch (e1) {
      lastError = e1;
      // 2) OpenAI (si hay key)
      try {
        translated = await translateWithOpenAI(text, targetLang);
        provider = "openai";
      } catch (e2) {
        lastError = e2;
        // 3) MyMemory (gratis)
        try {
          translated = await translateWithMyMemory(text, targetLang);
          provider = "mymemory";
        } catch (e3) {
          lastError = e3;
        }
      }
    }

    if (!translated) {
      console.warn("⚠️ Traducción: todos los proveedores fallaron:", lastError?.message || lastError);
      translated = text; // nunca rompemos el UI
      provider = "fallback-original";
    }

    cache.set(key, translated);
    return res.json({ cached: false, translated, provider });
  } catch (err) {
    console.error("❌ Error en /api/traducir:", err?.message || err);
    return res.status(200).json({
      translated: req.body?.text || "",
      provider: "fallback-original",
      cached: false,
    });
  }
});

export default router;
