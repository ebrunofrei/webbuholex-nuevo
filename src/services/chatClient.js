// ============================================================================
// LITIS | chatClient — R7.7+++ HARDENED (NO ZOMBIES)
// ----------------------------------------------------------------------------
// GUARANTEES:
// - Nunca lanza errores fatales
// - Nunca devuelve HTML
// - Siempre retorna { ok, message }
// ============================================================================

import { joinApi } from "@/services/apiBase";

// ------------------------------------------------------------
// CONSTANTS
// ------------------------------------------------------------
const PROMPT_MAX = 8000;
const HISTORY_MAX = 10;
const HISTORY_ITEM_MAX = 3000;
const TIMEOUT = 45000;

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const trim = (x) => String(x ?? "").trim();
const cap = (v, m) => String(v ?? "").slice(0, m);
const isHTML = (t) => /^<!DOCTYPE html>|<html/i.test(t || "");

const debug = (...a) => {
  if (import.meta.env.DEV) console.log("💬[chat-client]", ...a);
};

// ------------------------------------------------------------
// RESOLVE SESSION
// ------------------------------------------------------------
function resolveSessionId({ sessionId }) {
  if (typeof sessionId === "string" && sessionId.trim()) {
    return sessionId.trim();
  }
  return "__invalid_session_id__";
}

// ------------------------------------------------------------
// NORMALIZE PAYLOAD
// ------------------------------------------------------------
function normalizePayload(input) {
  if (!input || typeof input !== "object") {
    return null;
  }

  const prompt = trim(input.prompt);
  if (!prompt) return null;

  return {
    channel: input.channel || "home_chat",
    role: "consultive",
    sessionId: resolveSessionId(input),
    prompt: cap(prompt, PROMPT_MAX),
    history: Array.isArray(input.history)
      ? input.history.slice(-HISTORY_MAX).map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: cap(m.content, HISTORY_ITEM_MAX),
        }))
      : [],
  };
}

// ------------------------------------------------------------
// MAIN CALL — SAFE
// ------------------------------------------------------------
export async function sendChatMessage(payload) {
  const body = normalizePayload(payload);

  if (!body) {
    return {
      ok: false,
      code: "INVALID_PAYLOAD",
      message: "La consulta no es válida. Intenta reformularla.",
    };
  }

  async function doRequest() {
    return fetch(joinApi("/ia/chat"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  }

  let res;

  try {
    res = await Promise.race([
      doRequest(),
      sleep(TIMEOUT).then(() => {
        throw new Error("timeout");
      }),
    ]);
  } catch (err) {
    debug("NETWORK ERROR:", err);
    return {
      ok: false,
      code: "NETWORK_ERROR",
      message:
        "⚠️ No se pudo contactar con el servidor. Puedes reintentar sin problema.",
    };
  }

  // retry suave
  if ([502, 503, 504].includes(res.status)) {
    await sleep(400);
    try {
      res = await doRequest();
    } catch {
      return {
        ok: false,
        code: "RETRY_FAILED",
        message:
          "⚠️ El sistema está temporalmente saturado. Intenta nuevamente.",
      };
    }
  }

  const ct = res.headers.get("content-type") || "";

  if (!ct.includes("application/json")) {
    const text = await res.text();
    if (isHTML(text)) {
      debug("❌ HTML DETECTED");
      return {
        ok: false,
        code: "HTML_RESPONSE",
        message:
          "⚠️ El servidor devolvió una respuesta inválida. Reintentar es seguro.",
      };
    }

    return {
      ok: false,
      code: "INVALID_CONTENT",
      message: text || "Respuesta inválida del servidor.",
    };
  }

  let data;
  try {
    data = await res.json();
  } catch {
    return {
      ok: false,
      code: "JSON_PARSE_ERROR",
      message:
        "⚠️ Error al procesar la respuesta. Puedes continuar escribiendo.",
    };
  }

  if (!res.ok) {
    return {
      ok: false,
      code: `HTTP_${res.status}`,
      message:
        data?.error ||
        "⚠️ El sistema no pudo procesar la consulta en este momento.",
    };
  }

  return {
    ok: true,
    message:
      typeof data.message === "string"
        ? data.message
        : "He analizado tu consulta. ¿Deseas continuar?",
  };
}
