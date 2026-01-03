// ============================================================
// 🦉 BúhoLex | Cliente del Chat (frontend) – CANÓNICO 2025
// ------------------------------------------------------------
// - sessionId OBLIGATORIO (case_<caseId>)
// - Normalización estricta del payload
// - Timeout robusto + retry controlado
// - Sin cookies (CORS friendly)
// - Última línea de defensa antes del backend
// ============================================================

import { joinApi } from "@/services/apiBase";

const IS_BROWSER = typeof window !== "undefined";

// Límites duros
const PROMPT_MAX = 8000;
const HIST_MAX_ITEMS = 12;
const HIST_ITEM_MAX = 4000;

const HEALTH_TIMEOUT_MS = 3000;
const REQUEST_TIMEOUT_MS = 45000;

/* ============================================================
   Utils base
============================================================ */

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function safeTrim(v) {
  return String(v ?? "").trim();
}

function cap(v, max) {
  const s = String(v ?? "");
  return s.length > max ? s.slice(0, max) : s;
}

/* ============================================================
   sessionId CANÓNICO
============================================================ */

function resolveSessionId({ sessionId, caseId, expedienteId, chatId }) {
  if (typeof sessionId === "string" && sessionId.startsWith("case_")) {
    return sessionId;
  }

  const base = caseId || expedienteId || chatId;
  if (!base) return null;

  return `case_${String(base).slice(0, 96)}`;
}

/* ============================================================
   fetch con timeout
============================================================ */

async function fetchWithTimeout(url, opts = {}, ms = 15000) {
  const externalSignal = opts.signal;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);

  let cleanupExternal = null;
  if (externalSignal) {
    const onAbort = () => ctrl.abort();
    if (externalSignal.aborted) ctrl.abort();
    else {
      externalSignal.addEventListener("abort", onAbort, { once: true });
      cleanupExternal = () =>
        externalSignal.removeEventListener("abort", onAbort);
    }
  }

  try {
    const { signal: _ignored, ...rest } = opts;
    return await fetch(url, {
      ...rest,
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
    if (cleanupExternal) cleanupExternal();
  }
}

/* ============================================================
   Warm-up /health (1 vez por sesión)
============================================================ */

async function pingOnce({ signal } = {}) {
  if (!IS_BROWSER) return;
  if (window.__BUHOLEX_API_WARMED__) return;
  window.__BUHOLEX_API_WARMED__ = true;

  try {
    await fetchWithTimeout(
      joinApi("/health"),
      {
        method: "GET",
        credentials: "omit",
        cache: "no-store",
        mode: "cors",
        signal,
      },
      HEALTH_TIMEOUT_MS
    );
  } catch {
    /* silencio */
  }
}

/* ============================================================
   Normalización CANÓNICA del payload
============================================================ */

function normalizeChatPayload(input) {
  if (typeof input === "string") {
    throw new Error("sessionId canónico requerido (string no permitido)");
  }

  const obj = input || {};

  const rawPrompt = obj.prompt ?? obj.mensaje ?? "";
  const prompt = safeTrim(rawPrompt);
  if (!prompt) throw new Error("prompt vacío");

  const sessionId = resolveSessionId({
    sessionId: obj.sessionId,
    caseId: obj.caseId,
    expedienteId: obj.expedienteId,
    chatId: obj.chatId,
  });

  if (!sessionId) {
    throw new Error("sessionId canónico requerido (case_<caseId>)");
  }

  let historialNorm = [];
  if (Array.isArray(obj.historial)) {
    historialNorm = obj.historial
      .slice(-HIST_MAX_ITEMS)
      .map(m => ({
        role: m?.role === "assistant" ? "assistant" : "user",
        content: cap(String(m?.content || ""), HIST_ITEM_MAX),
      }));
  }

  const {
    mensaje,
    prompt: _p,
    historial: _h,
    caseId,
    chatId,
    expedienteId,
    sessionId: _s,
    ...rest
  } = obj;

  return {
    ...rest,
    sessionId, // 🔒 FUENTE ÚNICA
    prompt: cap(prompt, PROMPT_MAX),
    historial: historialNorm,
  };
}

/* ============================================================
   API pública
============================================================ */

export async function enviarMensajeIA(payload, signal) {
  await pingOnce({ signal });

  const normalized = normalizeChatPayload(payload);
  const body = JSON.stringify(normalized);
  const url = joinApi("/ia/chat");

  const doPost = () =>
    fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        credentials: "omit",
        cache: "no-store",
        mode: "cors",
        signal,
      },
      REQUEST_TIMEOUT_MS
    );

  let res;
  try {
    res = await doPost();
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new Error(
        "El servidor demoró demasiado en responder. Intenta nuevamente."
      );
    }
    throw err;
  }

  // Retry único en errores típicos de gateway
  if ([502, 503, 504].includes(res.status)) {
    await sleep(550);
    res = await doPost();
  }

  const isJson =
    (res.headers.get("content-type") || "").includes("application/json");

  if (!res.ok) {
    const msg = isJson
      ? (await res.json())?.error || `Chat HTTP ${res.status}`
      : await res.text();

    throw new Error(msg || `Chat HTTP ${res.status}`);
  }

  return isJson ? await res.json() : { ok: true, text: await res.text() };
}
