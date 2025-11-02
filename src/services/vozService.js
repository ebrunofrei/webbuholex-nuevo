// src/services/vozService.js

/** =========================
 *  Utilidades base de API
 *  ========================= */
function getApiBaseUrl() {
  const raw = (import.meta.env?.VITE_API_BASE_URL || "").trim();
  const base = raw !== "" ? raw : "http://localhost:3000/api";
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

function joinApi(path) {
  const base = getApiBaseUrl();
  return path.startsWith("/") ? base + path : `${base}/${path}`;
}

/** =========================
 *  Audio (singleton)
 *  ========================= */
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
    // reset src para liberar stream u objectURL si aplica
    audio.src = "";
    audio.removeAttribute("src");
    // Safari a veces mantiene el stream si no se fuerza el load()
    audio.load?.();
  } catch {}
}

/** =========================
 *  Helpers de TTS
 *  ========================= */

// Mapeo simple de alias → voces reales de Azure
const VOICES = {
  masculina_profesional: "es-ES-AlvaroNeural",
  masculina_alvaro: "es-ES-AlvaroNeural",
  // agrega aquí otros alias que uses
};

function normalizarVoz(voz) {
  const v = (voz || "").trim();
  return VOICES[v] || v || "es-ES-AlvaroNeural";
}

/** Límite de seguridad para el texto (SSML puede tener límites) */
const MAX_TTS_CHARS = 1200;

/** Retorna el mismo texto, pero saneado y truncado si excede el límite */
function sanitizarTexto(texto) {
  let t = String(texto ?? "").replace(/\s+/g, " ").trim();
  if (t.length > MAX_TTS_CHARS) {
    t = t.slice(0, MAX_TTS_CHARS - 1) + "…";
  }
  return t;
}

/** Pequeño helper para timeout de promesas (fetch/play) */
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

/** Prueba rápida de salud del endpoint /api/voz/health */
export async function ttsHealth() {
  const url = joinApi("/voz/health");
  const resp = await withTimeout(fetch(url), 6000, "Timeout /voz/health");
  if (!resp.ok) throw new Error(`TTS health ${resp.status}`);
  return resp.json().catch(() => ({}));
}

/** =========================
 *  Cliente TTS
 *  ========================= */

/**
 * Reproduce TTS. Intenta primero GET (streaming). Si falla, cae a POST (blob).
 * @param {string} texto
 * @param {{ voz?: string, rate?: number|string, pitch?: number|string }} opts
 */
export async function reproducirVozVaronil(
  texto,
  { voz = "masculina_profesional", rate = 0, pitch = 0 } = {}
) {
  const clean = sanitizarTexto(texto);
  if (!clean) return;

  // detener cualquier reproducción activa antes de iniciar una nueva
  stopVoz();

  const voice = normalizarVoz(voz);
  const audio = getAudio();

  // 1) Intento GET (streaming), recomendado
  try {
    const qs = new URLSearchParams({
      say: clean,
      voice,
      rate: String(parseInt(rate, 10) || 0),
      pitch: String(parseInt(pitch, 10) || 0),
    });

    audio.src = `${joinApi("/voz")}?${qs.toString()}`;
    // Algunos navegadores requieren interacción de usuario previa para autoplay;
    // si falla, caeremos al POST.
    await withTimeout(audio.play(), 8000, "Timeout al reproducir (GET)");
    return; // ✅ Listo con GET
  } catch (errGet) {
    // cae al POST
    // console.warn("TTS GET falló, intentando POST…", errGet);
  }

  // 2) Fallback POST (descarga blob y reproduce)
  let objectURL;
  try {
    const body = {
      texto: clean,
      voz: voice,
      rate: parseInt(rate, 10) || 0,
      pitch: parseInt(pitch, 10) || 0,
    };

    const resp = await withTimeout(
      fetch(joinApi("/voz"), {
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
  } catch (errPost) {
    throw errPost;
  } finally {
    // Liberar objectURL cuando termine/error
    const revoke = () => {
      if (objectURL) URL.revokeObjectURL(objectURL);
      objectURL = null;
      audio.onended = null;
      audio.onerror = null;
    };
    audio.onended = revoke;
    audio.onerror = revoke;
  }
}
