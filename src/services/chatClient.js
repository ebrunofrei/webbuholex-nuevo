// ============================================================
// 🦉 BúhoLex | Cliente de Chat IA (apiBase unificada)
// Endpoints: /ia/test (GET), /ia/chat (POST)
// - Normaliza payload (texto → prompt)
// - Soporta modo y expectsCitations
// - Opcionales: temperature, model
// - AbortSignal y backoff de apiBase
// ============================================================
import { joinApi, fetchJSON, healthCheck } from "@/services/apiBase";

/** Ping rápido para UI (no bloquea) */
export async function pingIA() {
  return healthCheck("/ia/test");
}

/**
 * Normaliza el payload al contrato del backend.
 * Acepta { texto } o { prompt } y mapea a { prompt }.
 */
function normalizePayload(input = {}) {
  const {
    texto,              // compat viejo
    prompt,
    usuarioId,
    expedienteId,
    idioma,
    pais,
    modo,               // si viene en payload, lo respetamos
    materia,
    historial,
    userEmail,
    ...rest
  } = input;

  const finalPrompt = (prompt ?? texto ?? "").toString();

  return {
    prompt: finalPrompt,
    ...(usuarioId    ? { usuarioId }    : {}),
    ...(expedienteId ? { expedienteId } : {}),
    ...(idioma       ? { idioma }       : {}),
    ...(pais         ? { pais }         : {}),
    ...(modo         ? { modo }         : {}),
    ...(materia      ? { materia }      : {}),
    ...(Array.isArray(historial) ? { historial } : {}),
    ...(userEmail    ? { userEmail }    : {}),
    ...rest, // cualquier metadato adicional
  };
}

/**
 * Envía un mensaje al backend de IA
 * @param {Object} payload - { prompt?:string, texto?:string, usuarioId?, expedienteId?, idioma?, pais?, historial?, userEmail? }
 * @param {Object} opts    - { signal?:AbortSignal, modo?:string, expectsCitations?:boolean, temperature?:number, model?:string }
 * @returns {Promise<{ok:boolean, respuesta?:string, citations?:Array, sugerencias?:Array, ...}>}
 */
export async function enviarMensajeIA(payload, opts = {}) {
  const {
    signal,
    modo = "litigante",
    expectsCitations = true,
    temperature,
    model,
  } = opts;

  const body = {
    ...normalizePayload(payload),
    // prioridad a opts.modo sobre payload.modo
    ...(modo ? { modo } : {}),
    expectsCitations,
    ...(temperature != null ? { temperature } : {}),
    ...(model ? { model } : {}),
  };

  return fetchJSON(
    joinApi("/ia/chat"),
    { method: "POST", body: JSON.stringify(body), signal },
    { timeoutMs: 30000, retries: 1 }
  );
}
