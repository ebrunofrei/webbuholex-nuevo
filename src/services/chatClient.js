// ============================================================================
// LITIS | chatClient (R7.7++ FINAL — 2026)
// ----------------------------------------------------------------------------
// Compatible with:
//   POST /api/ia/chat
//   GET  /api/chat-sessions
//   GET  /api/chat-messages?sessionId=xxx
//
// Zero-HTML, JSON-only, retry-safe.
/**
 * ⚠️ USO EXCLUSIVO:
 * - Chat General / Home
 * - Canal consultivo
 * - Sin ratio legis
 * - Sin PDFs
 * - Sin análisis profundo
 *
 * ❌ NO usar en Bubble ni Chat Pro
 */

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

// Debug visible solo en dev
const debug = (...a) => {
  if (import.meta.env.DEV) console.log("💬[chat-client]", ...a);
};

// ------------------------------------------------------------
// RESOLVE SESSION — canonical
// ------------------------------------------------------------
function resolveSessionId({ sessionId }) {
  if (typeof sessionId === "string" && sessionId.trim()) return sessionId.trim();
  return "__invalid_session_id__"; // avoids crashes
}

// ------------------------------------------------------------
// NORMALIZE PAYLOAD
// ------------------------------------------------------------
function normalizePayload(input) {
  if (!input || typeof input !== "object")
    throw new Error("Invalid chat payload.");

  const prompt = trim(input.prompt);
  if (!prompt) throw new Error("Empty prompt.");

  const sessionId = resolveSessionId(input);

  return {
    channel: input.channel || "home_chat",
    role: "consultive",
    sessionId,
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
// NETWORK CALL
// ------------------------------------------------------------
export async function sendChatMessage(payload) {
  const body = JSON.stringify(normalizePayload(payload));

  async function doRequest() {
    return fetch(joinApi("/ia/chat"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      cache: "no-store",
    });
  }

  let res;

  try {
    // timeout protector
    res = await Promise.race([
      doRequest(),
      sleep(TIMEOUT).then(() => {
        throw new Error("Request timeout.");
      }),
    ]);
  } catch (err) {
    debug("NETWORK FAIL:", err);
    throw new Error("No se pudo contactar con el servidor.");
  }

  // retry resiliente
  if ([502, 503, 504].includes(res.status)) {
    await sleep(400);
    res = await doRequest();
  }

  const ct = res.headers.get("content-type") || "";

  if (!ct.includes("application/json")) {
    const text = await res.text();
    if (isHTML(text)) {
      debug("❌ Backend devolvió HTML");
      throw new Error("Respuesta inválida del servidor (HTML detectado).");
    }
    throw new Error(text || "Respuesta inválida del servidor.");
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error || `HTTP ${res.status}`);
  }

  return data;
}
