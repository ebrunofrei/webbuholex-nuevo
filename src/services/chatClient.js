// src/services/chatClient.js
// ============================================================
// 🦉 BúhoLex | Cliente del Chat (frontend)
// - URLs unificadas con joinApi("/ia/...")
// - Ping rápido a /ia/test para “despertar” el backend
// - Normaliza payload: string | {mensaje} | {prompt}
// - Manejo de errores claro (JSON/Text)
// ============================================================

import { joinApi } from "@/services/apiBase";

// --- normaliza formas de entrada a { prompt, ...rest }
function normalizeChatPayload(input) {
  // string → { prompt }
  if (typeof input === "string") {
    const prompt = input.trim();
    if (!prompt) throw new Error("prompt vacío");
    return { prompt };
  }

  const obj = input || {};
  const raw = obj.prompt ?? obj.mensaje ?? "";
  const prompt = String(raw || "").trim();
  if (!prompt) throw new Error("prompt vacío");

  // preserva el resto (usuarioId, userEmail, modo, materia, idioma, pais, historial, etc.)
  const { mensaje, ...rest } = obj;
  return { prompt, ...rest };
}

// --- ping rápido para evitar ECONNRESET al arrancar el backend
async function ping({ signal } = {}) {
  const url = joinApi("/ia/test");
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 2000);
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: signal || ctrl.signal,
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * enviarMensajeIA(payload, signal?)
 * payload puede ser:
 *  - "texto"
 *  - { mensaje: "texto", ... }
 *  - { prompt: "texto", usuarioId, expedienteId, modo, materia, idioma, pais, historial, userEmail }
 */
export async function enviarMensajeIA(payload, signal) {
  // “despierta” el backend si está frío
  await ping({ signal }).catch(() => {});

  const body = JSON.stringify(normalizeChatPayload(payload));

  const res = await fetch(joinApi("/ia/chat"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    signal,
    credentials: "include",
  });

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
    } catch (e) {
      // si el parse falla, devolvemos un error genérico con el status
      throw new Error(`Chat HTTP ${res.status}`);
    }
  }

  // Backend devuelve { ok:true, respuesta, intencion, materiaDetectada, ... }
  return isJson ? await res.json() : { ok: true, text: await res.text() };
}
