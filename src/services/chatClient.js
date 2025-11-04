// src/services/chatClient.js
// ============================================================
// 🦉 BúhoLex | Cliente del Chat (frontend)
// - Usa /chat-api (proxy en dev y rewrite en prod)
// - Si VITE_CHAT_API_BASE_URL está en PROD y NO es localhost, se respeta
// - Normaliza payload: string | {mensaje} | {prompt}
// ============================================================

const normalize = (u = "") => String(u).trim().replace(/\/+$/, "");
const isLocal = (u = "") =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?/i.test(String(u));

const RAW_CHAT = import.meta?.env?.VITE_CHAT_API_BASE_URL || "";
const ENV_CHAT = normalize(RAW_CHAT);

// PROD: ENV si NO es localhost; si no, "/chat-api"
// DEV: siempre "/chat-api" (proxy de Vite)
export const CHAT_BASE = import.meta.env.PROD
  ? (ENV_CHAT && !isLocal(ENV_CHAT) ? ENV_CHAT : "/chat-api")
  : "/chat-api";

export const buildChatUrl = (p = "") =>
  `${CHAT_BASE}/${String(p).replace(/^\/+/, "")}`;

// --- ping rápido para evitar ECONNRESET al arrancar backend
async function ping({ signal } = {}) {
  try {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), 2000);
    const r = await fetch(buildChatUrl("/health"), {
      signal: signal || ctrl.signal,
      credentials: "include",
    });
    clearTimeout(id);
    return r.ok;
  } catch {
    return false;
  }
}

// --- normaliza formas de entrada a { prompt, ...rest }
function normalizeChatPayload(input) {
  if (typeof input === "string") {
    const prompt = input.trim();
    if (!prompt) throw new Error("prompt vacío");
    return { prompt };
  }
  const obj = input || {};
  const raw = obj.prompt ?? obj.mensaje ?? "";
  const prompt = String(raw || "").trim();
  if (!prompt) throw new Error("prompt vacío");
  const { mensaje, ...rest } = obj;
  return { prompt, ...rest };
}

export async function enviarMensajeIA(payload, signal) {
  await ping({ signal }).catch(() => {});
  const body = JSON.stringify(normalizeChatPayload(payload));

  const r = await fetch(buildChatUrl("/ia/chat"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    signal,
    credentials: "include",
  });

  const ctype = r.headers.get("content-type") || "";
  const isJson = ctype.includes("application/json");

  if (!r.ok) {
    try {
      if (isJson) {
        const j = await r.json();
        throw new Error(j?.error?.message || j?.message || `Chat HTTP ${r.status}`);
      } else {
        const t = await r.text();
        throw new Error(t || `Chat HTTP ${r.status}`);
      }
    } catch {
      throw new Error(`Chat HTTP ${r.status}`);
    }
  }

  return isJson ? await r.json() : { ok: true, text: await r.text() };
}
