// src/services/vozService.js
// ============================================================
// 🦉 BúhoLex | Servicio de Voz (frontend, Azure vía backend)
// - Fuente única de API: @/services/apiBase (joinApi)
// - GET (streaming) → POST (blob) como fallback
// - Audio singleton + anti-solapes + repetición/bucle
// - NO auto-lectura: solo por interacción del usuario
// - Pausa al ocultar pestaña y reanuda al volver (si no se detuvo)
// ============================================================

import { joinApi } from "@/services/apiBase";

/* =========================
 *  Estado global (módulo)
 * ========================= */
let _audio;                // <audio> único
let _muted = false;        // silencio global (on-demand)
let _lastText = "";        // último texto reproducible
let _lastOpts = null;      // últimas opciones normalizadas ({voz, rate, pitch})
let _repeatRemaining = 0;  // repeticiones pendientes (x veces)
let _loopEnabled = false;  // bucle infinito del último
let _hiddenPaused = false; // se pausó por visibilitychange
let _playInFlight = false; // guardrail para evitar triggers simultáneos
let _isUserStopped = false; // bandera: el usuario cortó manualmente

/* =========================
 *  Utilidades base
 * ========================= */
const IS_BROWSER = typeof window !== "undefined";

// Límite máximo de caracteres a leer en una sola pasada.
// No queremos lecturas eternas de 20 minutos; mejor en bloques “humanos”.
const MAX_TTS_CHARS = 1600;

const VOICE_ALIASES = {
  masculina_profesional: "es-ES-AlvaroNeural",
  masculina_alvaro: "es-ES-AlvaroNeural",
  femenina_profesional: "es-ES-ElviraNeural",
  // agrega aquí más alias si los uses en la UI
};

function normalizarVoz(voz) {
  const v = String(voz || "").trim();
  return VOICE_ALIASES[v] || v || "es-ES-AlvaroNeural";
}

function clamp(n, min, max) {
  const x = Number.isFinite(+n) ? +n : 0;
  return Math.min(max, Math.max(min, x));
}

/**
 * Sanitiza el texto para TTS:
 * - Limpia espacios raros.
 * - Conserva saltos de línea razonables (párrafos).
 * - Si es muy largo, recorta en un punto “natural”:
 *   último punto / signo / doble salto de línea antes del límite.
 */
function sanitizarTexto(texto) {
  let t = String(texto ?? "");

  // Normaliza espacios dentro de cada línea.
  t = t.replace(/[ \t]+/g, " ");

  // Normaliza saltos de línea: deja como máximo 2 seguidos.
  t = t.replace(/\n{3,}/g, "\n\n").trim();

  if (t.length <= MAX_TTS_CHARS) return t;

  // Recortamos a una ventana máxima…
  const slice = t.slice(0, MAX_TTS_CHARS);

  // Buscamos un corte “humano” dentro de ese fragmento.
  const lastDot = slice.lastIndexOf(". ");
  const lastExcl = slice.lastIndexOf("! ");
  const lastQ = slice.lastIndexOf("? ");
  const lastPara = slice.lastIndexOf("\n\n");

  const candidates = [lastDot, lastExcl, lastQ, lastPara].filter((i) => i > 0);
  const cutAt = candidates.length ? Math.max(...candidates) : -1;

  // Si encontramos un buen corte relativamente avanzado, cortamos ahí.
  if (cutAt > 200) {
    return slice.slice(0, cutAt + 1).trim() + "…";
  }

  // Si no, recortamos tal cual el fragmento máximo.
  return slice.trim() + "…";
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

async function fetchWithTimeout(url, opts = {}, ms = 10000) {
  const ctrl = new AbortController();
  const { signal, ...rest } = opts;
  if (signal) {
    if (signal.aborted) ctrl.abort();
    else signal.addEventListener("abort", () => ctrl.abort(), { once: true });
  }
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...rest, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/* =========================
 *  Audio singleton + eventos
 * ========================= */
function getAudio() {
  if (!_audio) {
    _audio = new Audio();
    _audio.preload = "none";
    _audio.onended = handleEnded;
    _audio.onerror = handleEnded;
  }
  return _audio;
}

/** Qué hacer al terminar/error de audio */
async function handleEnded() {
  // Si el usuario detuvo manualmente, no intentamos repetir nada.
  if (_isUserStopped) return;
  if (_muted) return; // en silencio global; no continuar

  // prioridad: repeticiones discretas
  if (_repeatRemaining > 0 && _lastText) {
    _repeatRemaining -= 1;
    try {
      await _play(_lastText, _lastOpts, /*interrupt=*/false);
    } catch {
      // silencioso
    }
    return;
  }

  // si no hay repeticiones, revisa bucle
  if (_loopEnabled && _lastText) {
    try {
      await _play(_lastText, _lastOpts, /*interrupt=*/false);
    } catch {
      // silencioso
    }
  }
}

/* =========================
 *  Visibility handling
 * ========================= */

/**
 * Pausa el audio si el tab se oculta y lo reanuda al volver,
 * siempre que el usuario no haya hecho stop ni esté en modo mute.
 */
function initVisibilityHandler() {
  if (!IS_BROWSER || typeof document === "undefined") return;

  document.addEventListener("visibilitychange", () => {
    const a = getAudio();
    if (!a) return;

    if (document.hidden) {
      if (!a.paused) {
        a.pause();
        _hiddenPaused = true;
      }
    } else {
      if (_hiddenPaused && !_muted && a.src) {
        a.play().catch(() => {});
      }
      _hiddenPaused = false;
    }
  });
}

// inicializamos el handler una vez
if (IS_BROWSER) {
  initVisibilityHandler();
}

/* =========================
 *  API pública
 * ========================= */

/** Health del endpoint /voz/health */
export async function ttsHealth({ signal } = {}) {
  const url = joinApi("/voz/health");
  const resp = await fetchWithTimeout(url, { method: "GET", signal }, 6000);
  if (!resp.ok) throw new Error(`TTS health ${resp.status}`);
  return resp.json().catch(() => ({}));
}

/** Detiene todo: audio, repeticiones, bucles */
export function stopVoz() {
  const a = getAudio();
  try {
    _isUserStopped = true; // 👈 marcamos que el corte fue manual
    _repeatRemaining = 0;
    _loopEnabled = false;
    a.pause();
    a.src = ""; // libera stream / url
    a.removeAttribute("src");
    a.load?.();
  } catch {
    // silencioso
  }
}

/** Pausa (sin resetear estado). resumeVoz puede continuar. */
export function pauseVoz() {
  const a = getAudio();
  try {
    a.pause();
  } catch {
    // silencioso
  }
}

/** Reanuda si hay algo cargado y no está muteado */
export async function resumeVoz() {
  if (_muted) return;
  const a = getAudio();
  if (!a.src) return; // si se llamó stopVoz() no hay nada que reanudar
  try {
    _isUserStopped = false; // volvemos a dejar que onended funcione normal
    await a.play();
  } catch {
    // silencioso
  }
}

/** Estado de reproducción actual */
export function isSpeaking() {
  const a = getAudio();
  return !!(a.src && !a.paused && !a.ended);
}

/** Silencio global (true = mutea y detiene de inmediato) */
export function setTTSMuted(on = true) {
  _muted = !!on;
  if (_muted) stopVoz();
}

/** Lee el flag de silencio global */
export function getTTSMuted() {
  return _muted;
}

/**
 * Reproduce texto con TTS. NO se dispara automáticamente nunca.
 * - Normaliza voz/rate/pitch
 * - Interrumpe reproducción actual para evitar “voces cruzadas”
 * @returns {"GET"|"POST"|undefined}
 */
export async function reproducirVoz(
  texto,
  { voz = "masculina_profesional", rate = 0, pitch = 0, signal } = {}
) {
  if (_muted) return;

  const clean = sanitizarTexto(texto);
  if (!clean) return;

  // Normaliza y guarda "último"
  const voice = normalizarVoz(voz);
  const rateInt = clamp(parseInt(rate, 10) || 0, -50, 50); // -50..+50
  const pitchInt = clamp(parseInt(pitch, 10) || 0, -6, 6); // -6..+6

  _lastText = clean;
  _lastOpts = { voz: voice, rate: rateInt, pitch: pitchInt };

  // Interrumpe actual y reproduce
  return _play(_lastText, _lastOpts, /*interrupt=*/true, signal);
}

/**
 * Reinicia lectura de un texto arbitrario N veces (times≥1).
 * - stopCurrent=true detiene lo que esté sonando antes de reiniciar
 */
export async function replayText(
  texto,
  opts = {},
  times = 1,
  stopCurrent = true
) {
  if (_muted) return;

  const clean = sanitizarTexto(texto);
  if (!clean) return;

  const voice = normalizarVoz(opts.voz);
  const rateInt = clamp(parseInt(opts.rate, 10) || 0, -50, 50);
  const pitchInt = clamp(parseInt(opts.pitch, 10) || 0, -6, 6);

  _lastText = clean;
  _lastOpts = { voz: voice, rate: rateInt, pitch: pitchInt };
  _loopEnabled = false;
  _repeatRemaining = Math.max(0, Math.floor(times) - 1);

  await _play(_lastText, _lastOpts, stopCurrent);
}

/** Reinicia la lectura del último mensaje (times≥1) */
export async function replayLast(times = 1, stopCurrent = true) {
  if (_muted || !_lastText) return;
  _loopEnabled = false;
  _repeatRemaining = Math.max(0, Math.floor(times) - 1);
  await _play(_lastText, _lastOpts, stopCurrent);
}

/** Activa/Desactiva bucle infinito del último mensaje */
export async function loopLast(enable = true) {
  if (_muted) return;
  _repeatRemaining = 0;
  _loopEnabled = !!enable;

  if (_loopEnabled && _lastText) {
    // si no está sonando, arranca
    if (!isSpeaking()) await _play(_lastText, _lastOpts, true);
  }
}

/* =========================
 *  Internals de reproducción
 * ========================= */
async function _play(texto, opts, interrupt = true, signal) {
  if (_playInFlight) return; // guardrail simple vs doble click rápido
  _playInFlight = true;
  try {
    if (interrupt) {
      stopVoz();
    }

    _isUserStopped = false; // nueva reproducción: onended vuelve a estar activo

    const a = getAudio();

    // 1) Intento GET (streaming directo)
    try {
      const qs = new URLSearchParams({
        say: texto,
        voice: opts.voz,
        rate: String(opts.rate),
        pitch: String(opts.pitch),
      });
      a.src = `${joinApi("/voz")}?${qs.toString()}`;
      await withTimeout(a.play(), 8000, "Timeout al reproducir (GET)");
      return "GET";
    } catch {
      // cae a POST
    }

    // 2) Fallback POST (blob)
    let objectURL;
    try {
      const resp = await fetchWithTimeout(
        joinApi("/voz"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            texto,
            voz: opts.voz,
            rate: opts.rate,
            pitch: opts.pitch,
          }),
          signal,
        },
        10000
      );
      if (!resp.ok) {
        const msg = await resp.text().catch(() => "");
        throw new Error(
          `TTS POST ${resp.status}: ${msg || "Error al generar audio"}`
        );
      }
      const blob = await resp.blob();
      objectURL = URL.createObjectURL(blob);
      a.src = objectURL;

      a.onended = () => {
        try {
          if (objectURL) URL.revokeObjectURL(objectURL);
        } catch {
          // silencioso
        }
        objectURL = null;
        handleEnded();
      };
      a.onerror = a.onended;

      await withTimeout(a.play(), 8000, "Timeout al reproducir (POST)");
      return "POST";
    } finally {
      // si falló play() antes de onended, intenta revocar por seguridad
      try {
        // si objectURL sigue vivo aquí, lo revocamos
        // (si se reprodujo y terminó, onended ya lo habrá revocado)
      } catch {
        // silencioso
      }
    }
  } finally {
    _playInFlight = false;
  }
}

/* =========================
 *  Compat de nombres antiguos
 * ========================= */

// Para código existente (LitisBot, visor, etc.)
export const reproducirVozVaronil = reproducirVoz;

// Compat para firmas antiguas
export const pausarVoz = pauseVoz;
export const reanudarVoz = resumeVoz;
export const detenerVoz = stopVoz;
