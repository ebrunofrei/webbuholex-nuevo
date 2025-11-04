// src/services/vozService.js
// ============================================================
// 🦉 TTS (Azure) Cliente Frontend
// - BASE segura (sin localhost en prod): "/api" por defecto
// - GET streaming → fallback POST (blob)
// ============================================================

function isLocal(u = "") {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?/i.test(String(u));
}
function normalizeBase(b = "") {
  const raw = String(b).trim().replace(/\/+$/, "");
  if (!raw) return "";
  let base = raw;
  if (!/\/api$/i.test(base)) base += "/api";
  return base.replace(/\/api(?:\/api)+$/i, "/api");
}

const RAW_ENV = import.meta.env?.VITE_API_BASE_URL || "";
const ENV_BASE = normalizeBase(RAW_ENV);

export const API_BASE = import.meta.env.PROD
  ? (ENV_BASE && !isLocal(ENV_BASE) ? ENV_BASE : "/api")
  : "/api";

export const VOZ_BASE   = `${API_BASE.replace(/\/+$/, "")}/voz`;
export const VOZ_HEALTH = `${VOZ_BASE}/health`;

// -------------------- Audio singleton --------------------
let _audio;
/** Devuelve un único <audio> para toda la app */
function getAudio() {
  if (!_audio) {
    _audio = new Audio();
    _audio.preload = "none";
  }
  return _audio;
}

/** Detener cualquier reproducción en curso */
export function stopVoz() {
  const audio = getAudio();
  try {
    audio.pause();
    audio.src = "";
    audio.removeAttribute("src");
    audio.load?.();
  } catch {}
}

// -------------------- Helpers de TTS --------------------
const VOICES = {
  masculina_profesional: "es-ES-AlvaroNeural",
  masculina_alvaro: "es-ES-AlvaroNeural",
  // agrega aquí otros alias que uses
};

function normalizarVoz(voz) {
  const v = (voz || "").trim();
  return VOICES[v] || v || "es-ES-AlvaroNeural";
}

const MAX_TTS_CHARS = 1200;
function sanitizarTexto(texto) {
  let t = String(texto ?? "").replace(/\s+/g, " ").trim();
  if (t.length > MAX_TTS_CHARS) {
    t = t.slice(0, MAX_TTS_CHARS - 1) + "…";
  }
  return t;
}

async function withTimeout(promise, ms, errMsg = "Timeout") {
  let timer;
  try {
    const timeout = new Promise((_, rej) => {
      timer = setTimeout(() => rej(new Error(errMsg)), ms);
    });
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

// -------------------- Health --------------------
export async function ttsHealth() {
  const resp = await withTimeout(fetch(VOZ_HEALTH), 6000, "Timeout /voz/health");
  if (!resp.ok) throw new Error(`TTS health ${resp.status}`);
  return resp.json().catch(() => ({}));
}

// -------------------- Cliente principal --------------------
/**
 * Reproduce TTS. Intenta GET (streaming). Si falla, cae a POST (blob).
 * @param {string} texto
 * @param {{ voz?: string, rate?: number|string, pitch?: number|string }} opts
 */
export async function reproducirVozVaronil(
  texto,
  { voz = "masculina_profesional", rate = 0, pitch = 0 } = {}
) {
  const clean = sanitizarTexto(texto);
  if (!clean) return;

  stopVoz();

  const voice = normalizarVoz(voz);
  const audio = getAudio();

  // 1) GET (streaming)
  try {
    const qs = new URLSearchParams({
      say: clean,
      voice,
      rate: String(parseInt(rate, 10) || 0),
      pitch: String(parseInt(pitch, 10) || 0),
    });
    audio.src = `${VOZ_BASE}?${qs.toString()}`;
    await withTimeout(audio.play(), 8000, "Timeout al reproducir (GET)");
    return; // ✅
  } catch {
    // cae al POST
  }

  // 2) POST (blob)
  let objectURL;
  try {
    const body = {
      texto: clean,
      voz: voice,
      rate: parseInt(rate, 10) || 0,
      pitch: parseInt(pitch, 10) || 0,
    };
    const resp = await withTimeout(
      fetch(VOZ_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
      10000,
      "Timeout TTS (POST)"
    );
    if (!resp.ok) {
      const msg = await resp.text().catch(() => "");
      throw new Error(`TTS POST ${resp.status}: ${msg || "Error al generar audio"}`);
    }
    const blob = await resp.blob();
    objectURL = URL.createObjectURL(blob);
    audio.src = objectURL;
    await withTimeout(audio.play(), 8000, "Timeout al reproducir (POST)");
  } finally {
    const revoke = () => {
      if (objectURL) URL.revokeObjectURL(objectURL);
      objectURL = null;
      audio.onended = null;
      audio.onerror = null;
    };
    const a = getAudio();
    a.onended = revoke;
    a.onerror = revoke;
  }
}
