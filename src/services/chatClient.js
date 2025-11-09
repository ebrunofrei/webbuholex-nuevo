// ============================================================
// 🦉 BúhoLex | Cliente de Chat IA (usa apiBase unificada)
// Endpoints: /ia/test (GET), /ia/chat (POST)
// ============================================================
import { joinApi, fetchJSON, healthCheck } from "@/services/apiBase";

/** Ping rápido para UI (no bloquea) */
export async function pingIA() {
  return healthCheck("/ia/test");
}

/**
 * Envía un mensaje al backend de IA
 * @param {{texto:string, usuarioId?:string, contexto?:object}} payload
 * @param {{signal?:AbortSignal, temperature?:number, model?:string}} opts
 */
export async function enviarMensajeIA(payload, opts = {}) {
  const body = {
    ...payload,
    ...(opts.temperature != null ? { temperature: opts.temperature } : {}),
    ...(opts.model ? { model: opts.model } : {}),
  };

  return await fetchJSON(
    joinApi("/ia/chat"),
    { method: "POST", body: JSON.stringify(body), signal: opts.signal },
    { timeoutMs: 30000, retries: 1 }
  );
}
