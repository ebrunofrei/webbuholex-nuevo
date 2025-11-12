// ============================================================
// 🦉 BúhoLex | Cliente del Chat (frontend)
// - joinApi para /health y /ia/chat
// - Normaliza payload (string | {mensaje} | {prompt})
// - Historial acotado (últimos 12 mensajes, 4k chars c/u)
// - Timeout y 1 reintento en 502/503/504
// - Sin cookies (credentials: 'omit') para facilitar CORS
// ============================================================

import { joinApi } from "@/services/apiBase";

/* ------------------------------ utils ------------------------------ */
async function fetchWithTimeout(url, opts = {}, ms = 15000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: opts.signal || ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

function normalizeChatPayload(input) {
  // string → { prompt }
  if (typeof input === "string") {
    const prompt = input.trim();
    if (!prompt) throw new Error("prompt vacío");
    return { prompt, historial: [] };
  }

  const obj = input || {};
  const raw = obj.prompt ?? obj.mensaje ?? "";
  const prompt = String(raw || "").trim();
  if (!prompt) throw new Error("prompt vacío");

  // acotar historial
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

  const { mensaje, ...rest } = obj;
  return { prompt, historial, ...rest };
}

async function ping({ signal } = {}) {
  try {
    const res = await fetchWithTimeout(
      joinApi("/health"),
      { method: "GET", credentials: "omit", cache: "no-store", signal },
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
 * payload:
 *  - "texto"
 *  - { mensaje: "texto", ... }
 *  - { prompt: "texto", usuarioId, expedienteId, modo, materia, idioma, pais, historial, userEmail }
 */
export async function enviarMensajeIA(payload, signal) {
  // “despertar” backend si está frío (ignorar si falla)
  await ping({ signal }).catch(() => {});

  const body = JSON.stringify(normalizeChatPayload(payload));

  const doPost = () =>
    fetchWithTimeout(
      joinApi("/ia/chat"),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal,
        credentials: "omit",
        cache: "no-store",
        mode: "cors",
      },
      15000
    );

  let res = await doPost();

  // Reintento simple si gateway/timeouts del backend
  if ([502, 503, 504].includes(res.status)) {
    await new Promise((r) => setTimeout(r, 500));
    res = await doPost();
  }

  const ctype = res.headers.get("content-type") || "";
  const isJson = ctype.includes("application/json");

  if (!res.ok) {
    try {
      if (isJson) {
        const j = await res.json();
        const msg = j?.error?.message || j?.error || j?.message || `Chat HTTP ${res.status}`;
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
