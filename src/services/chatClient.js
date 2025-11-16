// src/services/chatClient.js
// ============================================================
// 🦉 BúhoLex | Cliente del Chat (frontend)
// - joinApi para /health y /ia/chat
// - Normaliza payload (string | {mensaje} | {prompt})
// - Historial acotado (últimos 12 mensajes, 4k chars c/u)
// - Timeout y 1 reintento en 502/503/504
// - Sin cookies (credentials: 'omit') para facilitar CORS
// - Respeta campos de jurisprudencia: jurisprudenciaId, jurisTextoBase, etc.
// ============================================================

import { joinApi } from "@/services/apiBase";

const IS_BROWSER = typeof window !== "undefined";

/* ------------------------------ utils ------------------------------ */

/**
 * fetchWithTimeout(url, opts, ms)
 * - Aplica AbortController interno si no se pasa signal.
 * - Si se pasa `opts.signal`, se respeta ese signal (y el timeout solo limpia el timer).
 */
async function fetchWithTimeout(url, opts = {}, ms = 15000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);

  try {
    const { signal, ...rest } = opts;
    return await fetch(url, {
      ...rest,
      // Si el caller ya trae un signal, se respeta; si no, usamos el nuestro
      signal: signal || ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Normaliza el payload del chat.
 *
 * Soporta:
 *  - "texto"
 *  - { mensaje: "texto", ... }
 *  - { prompt: "texto", usuarioId, expedienteId, modo, materia, idioma, pais, historial, ... }
 *
 * Mantiene TODOS los campos adicionales (p.ej. jurisprudenciaId, jurisTextoBase, etc.).
 */
function normalizeChatPayload(input) {
  // string → { prompt }
  if (typeof input === "string") {
    const prompt = input.trim();
    if (!prompt) throw new Error("prompt vacío");
    return { prompt, historial: [] };
  }

  const obj = input || {};

  // prompt tiene prioridad, luego mensaje
  const raw = obj.prompt ?? obj.mensaje ?? "";
  const prompt = String(raw || "").trim();
  if (!prompt) throw new Error("prompt vacío");

  // acotar historial (si viene)
  let { historial } = obj;
  if (Array.isArray(historial)) {
    const take = 12;
    historial = historial.slice(-take).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content || "").slice(0, 4000),
    }));
  } else {
    historial = [];
  }

  // No reenviamos "mensaje" para evitar duplicidad; el resto se conserva tal cual.
  const { mensaje, ...rest } = obj;

  return {
    prompt,
    historial,
    ...rest, // aquí viajan jurisprudenciaId, jurisIds, jurisTextoBase, userEmail, etc.
  };
}

async function ping({ signal } = {}) {
  try {
    const res = await fetchWithTimeout(
      joinApi("/health"),
      {
        method: "GET",
        credentials: "omit",
        cache: "no-store",
        signal,
      },
      3000
    );
    return res.ok;
  } catch {
    return false;
  }
}

/* ------------------------------ API ------------------------------ */
/**
 * enviarMensajeIA(payload, signal?)
 *
 * payload:
 *  - "texto"
 *  - { mensaje: "texto", ... }
 *  - {
 *      prompt: "texto",
 *      usuarioId,
 *      expedienteId,
 *      modo,
 *      materia,
 *      idioma,
 *      pais,
 *      historial,
 *      userEmail,
 *      // 🔗 Campos de jurisprudencia (se respetan tal cual):
 *      jurisprudenciaId,
 *      jurisId,
 *      selectedJurisId,
 *      jurisprudenciaIds,
 *      jurisIds,
 *      jurisTextoBase,
 *    }
 */
export async function enviarMensajeIA(payload, signal) {
  // “despertar” backend si está frío (ignorar si falla)
  await ping({ signal }).catch(() => {});

  const body = JSON.stringify(normalizeChatPayload(payload));

  // ⏱️ margen más amplio para OpenAI + Railway
  const REQUEST_TIMEOUT_MS = 45000; // 45s

  const doPost = () =>
    fetchWithTimeout(
      joinApi("/ia/chat"),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        // si desde fuera nos pasan un signal, lo respetamos;
        // si no, fetchWithTimeout crea el suyo
        signal,
        credentials: "omit",
        cache: "no-store",
        mode: "cors",
      },
      REQUEST_TIMEOUT_MS
    );

  let res;
  try {
    res = await doPost();
  } catch (err) {
    // Caso especial: timeout → mensaje entendible
    if (err?.name === "AbortError") {
      throw new Error(
        "El servidor demoró demasiado en responder. Inténtalo otra vez en unos segundos."
      );
    }
    throw err;
  }

  const ctype = res.headers.get("content-type") || "";
  const isJson = ctype.includes("application/json");

  if (!res.ok) {
    try {
      if (isJson) {
        const j = await res.json();
        const msg =
          j?.error?.message ||
          j?.error ||
          j?.message ||
          `Chat HTTP ${res.status}`;
        throw new Error(msg);
      } else {
        const t = await res.text();
        throw new Error(t || `Chat HTTP ${res.status}`);
      }
    } catch {
      throw new Error(`Chat HTTP ${res.status}`);
    }
  }

  return isJson ? await res.json() : { ok: true, text: await res.text() };
}
