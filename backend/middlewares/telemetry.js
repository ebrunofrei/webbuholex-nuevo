// ============================================================================
// 📊 Telemetry Middleware — Ethical & Non-Intrusive
// ----------------------------------------------------------------------------
// - No content logging
// - Aggregated metrics only
// - Async, non-blocking
// - Backend-final (no UX impact)
// ============================================================================

export function withTelemetry(handler) {
  return async function telemetryWrapper(req, res) {
    const startedAt = Date.now();

    // --------------------------------------------------
    // Inicialización segura (sin contenido)
    // --------------------------------------------------
    res.locals._telemetry = {
      tool: "interpreter",
      inputType: req.body?.inputType || "unknown",
      mode: req.body?.mode || "legal",

      charsIn: 0,
      charsOut: 0,

      durationMs: 0,
      ok: false,

      // metadata técnica, no sensible
      models: [],
      softLimited: Boolean(res.locals?._softLimited),
    };

    // --------------------------------------------------
    // Interceptar res.json (sin romper Express)
    // --------------------------------------------------
    const originalJson = res.json.bind(res);

    res.json = (payload) => {
      try {
        const t = res.locals._telemetry;

        t.ok = Boolean(payload?.ok);
        t.durationMs = Date.now() - startedAt;

        // Conteos estrictamente derivados
        if (typeof payload?.originalText === "string") {
          t.charsIn = payload.originalText.length;
        }

        const outText =
          typeof payload?.normalizedText === "string"
            ? payload.normalizedText
            : typeof payload?.translatedText === "string"
              ? payload.translatedText
              : "";

        if (outText) {
          t.charsOut = outText.length;
        }

        // Emisión asíncrona (NO bloquea la respuesta)
        queueMicrotask(() => {
          try {
            emitTelemetry(t, req);
          } catch {}
        });

      } catch {
        // Nunca romper la respuesta por telemetría
      }

      return originalJson(payload);
    };

    // --------------------------------------------------
    // Ejecutar handler real
    // --------------------------------------------------
    return handler(req, res);
  };
}
