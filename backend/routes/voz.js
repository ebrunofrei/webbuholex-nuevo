// backend/routes/voz.js
import { Router, json } from "express";
import { pipeline } from "node:stream";
import { promisify } from "node:util";

const pump = promisify(pipeline);
const router = Router();

/* -------------------- Utilidades -------------------- */

function clamp(n, min, max) {
  const x = Number(n);
  return Math.min(Math.max(Number.isFinite(x) ? x : 0, min), max);
}

function toIntOrDefault(v, def = 0) {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
}

function escapeSSML(s) {
  // Escapa &, <, >, " y ' para SSML seguro
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Evita top-level await: resolvemos fetch en runtime
async function getFetch() {
  if (typeof globalThis.fetch === "function") return globalThis.fetch;
  const mod = await import("node-fetch");
  return mod.default;
}

/* -------------------- Health -------------------- */

router.get("/health", (_req, res) => {
  res.json({
    ok: true,
    region: process.env.AZURE_SPEECH_REGION || null,
    voice: process.env.AZURE_SPEECH_VOICE || "es-ES-AlvaroNeural",
    hasKey: !!process.env.AZURE_SPEECH_KEY,
  });
});

/* -------------------- Listar voces por región (diagnóstico) -------------------- */
/* Abre: GET /api/voz/voices  */
router.get("/voices", async (_req, res) => {
  try {
    const region = (process.env.AZURE_SPEECH_REGION || "").trim();
    const key    = (process.env.AZURE_SPEECH_KEY    || "").trim();
    if (!region || !key) return res.status(500).json({ error: "Faltan AZURE_SPEECH_REGION/KEY" });

    const fetchImpl = await getFetch();
    const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`;
    const r = await fetchImpl(url, {
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Ocp-Apim-Subscription-Region": region,
      },
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      return res.status(r.status).json({ error: "No se pudo listar voces", detail });
    }
    const data = await r.json();
    const esEs = data.filter(v => (v.Locale || "").toLowerCase() === "es-es");
    res.json({
      total: data.length,
      esES: esEs.map(v => v.ShortName),
      sample: data.slice(0, 10).map(v => v.ShortName)
    });
  } catch (e) {
    res.status(500).json({ error: "voices error", detail: e?.message || String(e) });
  }
});

/* -------------------- CORS (opcional por ruta) -------------------- */

router.options("/", (_req, res) => {
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "600");
  res.status(204).end();
});

/* -------------------- Handler único GET/POST -------------------- */

async function ttsHandler(req, res) {
  const controller = new AbortController();
  const timeoutMs = toIntOrDefault(process.env.AZURE_TTS_TIMEOUT_MS, 15000);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const fetchImpl = await getFetch();

    const isPost = req.method === "POST";
    const src = isPost ? (req.body || {}) : (req.query || {});

    // alias amigables
    const sayRaw   = src.say ?? src.texto ?? "";
    const voiceRaw = src.voice ?? src.voz ?? process.env.AZURE_SPEECH_VOICE ?? "es-ES-AlvaroNeural";

    // Usar % (más compatible en muchas regiones que 'st')
    const rate  = clamp(toIntOrDefault(src.rate, 0),  -50, 50); // %
    const pitch = clamp(toIntOrDefault(src.pitch, 0), -50, 50); // %

    const say = String(sayRaw).trim();
    if (!say) {
      return res.status(400).json({ error: "Parametro 'say' o 'texto' requerido" });
    }

    // Azure TTS limita SSML ~5000 chars (aprox). Protegemos.
    const MAX_CHARS = toIntOrDefault(process.env.AZURE_TTS_MAX_CHARS, 5000);
    if (say.length > MAX_CHARS) {
      return res.status(413).json({
        error: "Texto demasiado largo",
        detail: `Máximo permitido: ${MAX_CHARS} caracteres.`,
      });
    }

    const region = (process.env.AZURE_SPEECH_REGION || "").trim();   // ej: brazilsouth
    const key    = (process.env.AZURE_SPEECH_KEY    || "").trim();
    if (!region || !key) {
      return res.status(500).json({ error: "Faltan variables AZURE_SPEECH_REGION o AZURE_SPEECH_KEY" });
    }

    // SSML seguro con rate/pitch en %
    const ssml = `
<speak version="1.0" xml:lang="es-ES">
  <voice name="${String(voiceRaw)}">
    <prosody rate="${rate}%" pitch="${pitch}%">${escapeSSML(say)}</prosody>
  </voice>
</speak>`.trim();

    const baseHeaders = {
      "Ocp-Apim-Subscription-Key": key,
      "Ocp-Apim-Subscription-Region": region,
      "Content-Type": "application/ssml+xml; charset=utf-8",
      "User-Agent": "Buholex-TTS",
    };

    // Fallback de formatos (algunas regiones/planes rechazan ciertos bitrates)
    const formats = [
      "audio-24khz-160kbitrate-mono-mp3",
      "audio-24khz-48kbitrate-mono-mp3",
      "audio-16khz-32kbitrate-mono-mp3",
    ];

    let azureResp = null;
    let lastDetail = "";
    for (const fmt of formats) {
      const r = await fetchImpl(
        `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
        {
          method: "POST",
          headers: { ...baseHeaders, "X-Microsoft-OutputFormat": fmt },
          body: ssml,
          signal: controller.signal,
        }
      );

      if (r.status === 429) {
        const retryAfter = r.headers.get("retry-after");
        const when = retryAfter ? `; reintenta en ~${retryAfter}s` : "";
        return res.status(429).json({ error: "Azure TTS rate limited", detail: `HTTP 429${when}` });
      }

      const ctype = r.headers.get("content-type") || "";
      const isAudio = /audio\/|octet-stream/i.test(ctype);

      if (r.ok && isAudio) {
        azureResp = r;
        break;
      }

      // guarda detalle de error de este intento
      lastDetail = await r.text().catch(() => "");
    }

    if (!azureResp) {
      let detail = lastDetail;
      try { detail = JSON.parse(lastDetail); } catch {}
      return res.status(400).json({
        error: "Azure TTS falló",
        status: 400,
        detail,
      });
    }

    // Streaming hacia el cliente
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Disposition", 'inline; filename="voz.mp3"');

    await pump(azureResp.body, res);
  } catch (err) {
    if (err?.name === "AbortError") {
      return res.status(504).json({ error: "TTS timeout", detail: `>${timeoutMs}ms` });
    }
    console.error("[TTS] error:", err);
    return res.status(500).json({ error: "TTS interno", detail: err?.message || String(err) });
  } finally {
    clearTimeout(timeout);
  }
}

/* -------------------- Montaje de rutas -------------------- */
// Si tu app ya usa app.use(express.json()) global, puedes quitar json() aquí.
router.get("/", ttsHandler);
router.post("/", json({ limit: "1mb" }), ttsHandler);

export default router;
