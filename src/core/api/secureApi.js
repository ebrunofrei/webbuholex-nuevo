// src/core/api/secureApi.js
import { httpRequest, HttpError } from "./httpClient";
import { sanitizePayload } from "../security/sanitize";
import { validateChatRequest } from "../security/validate";
import { analytics } from "../analytics/analyticsClient";
import { events } from "../analytics/events";

function normalizeChatResponse(raw) {
  // Contrato canónico de salida para UI:
  // { ok: boolean, message: string, code?: string }
  const msg = raw?.message || raw?.respuesta || raw?.reply || "";
  return {
    ok: true,
    message: typeof msg === "string" && msg.trim() ? msg : "OK.",
    code: raw?.code || null,
  };
}

export const secureApi = {
  async chat(payload) {
    const clean = sanitizePayload(payload);
    validateChatRequest(clean);

    const started = performance.now();

    try {
      await analytics.track(events.CHAT_SEND, {
        channel: clean.channel,
        sessionId: clean.sessionId,
      });

      const { data, latencyMs } = await httpRequest("/ia/chat", {
        method: "POST",
        body: clean,
        retry: 1,
      });

      const out = normalizeChatResponse(data);

      await analytics.trackChatMessage({
        channel: clean.channel,
        sessionId: clean.sessionId,
        latencyMs,
        success: true,
        code: out.code,
      });

      return out;
    } catch (err) {
      const latencyMs = Math.round(performance.now() - started);

      // 401: métrica y mensaje humano
      if (err instanceof HttpError && err.status === 401) {
        await analytics.track(events.AUTH_401, {
          channel: clean.channel,
          sessionId: clean.sessionId,
          latencyMs,
        });

        return {
          ok: false,
          code: "AUTH_401",
          message: "Tu sesión expiró. Por favor, vuelve a iniciar sesión.",
        };
      }

      await analytics.track(events.API_ERROR, {
        channel: clean.channel,
        sessionId: clean.sessionId,
        latencyMs,
        code: err?.code || err?.name || "UNKNOWN",
      });

      return {
        ok: false,
        code: err?.code || "REQUEST_FAIL",
        message:
          err?.message ||
          "No se pudo procesar la solicitud. Intenta nuevamente.",
      };
    }
  },
};
