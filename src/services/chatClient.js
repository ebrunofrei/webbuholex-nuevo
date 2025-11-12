// src/services/chatClient.js
// ============================================================
// 🦉 BúhoLex | Cliente del Chat (frontend)
// - URLs unificadas con joinApi("/ia/...") o "/health"
// - Ping rápido a /health para “despertar” el backend
// - Normaliza payload: string | {mensaje} | {prompt}
// - Timeout + reintento en 502/503/504
// - Sin cookies (credentials: "omit") para simplificar CORS
// ============================================================

import { joinApi } from "@/services/apiBase";

// --- util: timeout de fetch
async function fetchWithTimeout(url, opts = {}, ms = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: opts.signal || ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

// --- normaliza formas de entrada a { prompt, ...rest } y acota historial
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

  // acotar historial (últimos 12 mensajes máx.)
  let { historial } = obj;
  if (Array.isArray(historial)) {
    const take = 12;
    historial = historial
      .slice(-take)
      .map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content || "").slice(0, 4000), // acota cada bloque
      }));
  } else {
    historial = [];
  }

  const { mensaje, ...rest } = obj;
  return { prompt, historial, ...rest };
}

// --- ping rápido para evitar ECONNRESET al arrancar el backend
async function ping({ signal } = {}) {
  const url = joinApi("/health"); // siempre existe
  try {
    const res = await fetchWithTimeout(url, {
      method: "GET",
      signal,
      credentials: "omit",
      cache: "no-store",
    }, 3000);
    return res.ok;
  } catch {
    return false;
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
  // “despierta” el backend si está frío (no pasa nada si falla)
  await ping({ signal }).catch(() => {});

  const body = JSON.stringify(normalizeChatPayload(payload));

  const doPost = async () =>
    fetchWithTimeout(joinApi("/ia/chat"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal,
      credentials: "omit",      // <- sin cookies
      cache: "no-store",
      mode: "cors",
    });

  // intento + 1 reintento si es 502/503/504
  let res = await doPost();
  if ([502, 503, 504].includes(res.status)) {
    await new Promise((r) => setTimeout(r, 500));
    res = await doPost();
  }

  const ctype = res.headers.get("content-type") || "";
  const isJson = ctype.includes("application/json");

  if (!res.ok) {
    // intenta devolver mensaje claro
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
