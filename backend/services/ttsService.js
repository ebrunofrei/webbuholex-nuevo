// backend/services/ttsService.js
import { TextEncoder } from "node:util";

/**
 * Sanitiza texto para SSML: elimina HTML y controla espacios.
 */
export function sanitizarTexto(texto = "") {
  return String(texto)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Escapa &, <, >, " y ' para SSML.
 */
function escapeSSML(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Construye SSML con controles de pitch y rate (en semitonos st).
 */
function buildSSML(texto, { voice, rate = 0, pitch = 0 }) {
  return `
<speak version="1.0" xml:lang="es-ES">
  <voice name="${voice}">
    <prosody rate="${rate}st" pitch="${pitch}st">${escapeSSML(texto)}</prosody>
  </voice>
</speak>`.trim();
}

/**
 * Llama directo a Azure TTS y devuelve un Buffer MP3.
 * Requiere env: AZURE_SPEECH_REGION, AZURE_SPEECH_KEY, AZURE_SPEECH_VOICE
 */
export async function generarVozVaronil(texto = "", opts = {}) {
  const region = process.env.AZURE_SPEECH_REGION?.trim();
  const key    = process.env.AZURE_SPEECH_KEY?.trim();
  const voice  = (opts.voice || process.env.AZURE_SPEECH_VOICE || "es-ES-AlvaroNeural").trim();

  if (!region || !key) {
    throw new Error("Faltan AZURE_SPEECH_REGION / AZURE_SPEECH_KEY");
  }

  const limpio = sanitizarTexto(texto);
  if (!limpio) throw new Error("Texto vacío");

  // Límite defensivo típico de Azure SSML (~5000 chars)
  const MAX = Number.parseInt(process.env.AZURE_TTS_MAX_CHARS || "5000", 10);
  if (limpio.length > MAX) throw new Error(`Texto demasiado largo (máx ${MAX})`);

  const ssml = buildSSML(limpio, {
    voice,
    rate: 0,   // ajusta si quieres (-20..20)
    pitch: 0,  // ajusta si quieres (-20..20)
  });

  const resp = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Ocp-Apim-Subscription-Region": region, // importante
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-160kbitrate-mono-mp3",
      "User-Agent": "Buholex-TTS",
    },
    body: ssml,
  });

  if (!resp.ok || !/audio\/|octet-stream/i.test(resp.headers.get("content-type") || "")) {
    const txt = await resp.text().catch(() => "");
    let detail = txt;
    try { detail = JSON.parse(txt); } catch {}
    throw new Error(`Azure TTS falló (${resp.status}): ${typeof detail === "string" ? detail : JSON.stringify(detail)}`);
  }

  const arr = new Uint8Array(await resp.arrayBuffer());
  return Buffer.from(arr);
}
