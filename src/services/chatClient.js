// ============================================================
// 🦉 BúhoLex | Cliente del Chat (frontend)
// - Usa /chat-api (proxy en dev y rewrite en prod)
// - Opcional: VITE_CHAT_API_BASE_URL si quieres forzar un absoluto
// - Normaliza payload: string | {mensaje} | {prompt}
// ============================================================

const DEFAULT_CHAT_BASE = "/chat-api";

const normalize = (u = "") => String(u).trim().replace(/\/+$/, "");
export const CHAT_BASE =
  normalize(import.meta?.env?.VITE_CHAT_API_BASE_URL || DEFAULT_CHAT_BASE);

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

  // preserva el resto (usuario, canal, meta, etc.)
  const { mensaje, ...rest } = obj;
  return { prompt, ...rest };
}

export async function enviarMensajeIA(payload, signal) {
  // ping rápido para evitar ECONNRESET al arrancar backend
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
