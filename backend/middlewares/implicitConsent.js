// ============================================================================
// 🛡️ implicitConsent — Consentimiento implícito no intrusivo
// ----------------------------------------------------------------------------
// - No bloquea UX
// - No muestra banners
// - Registra uso consciente de herramientas lingüísticas
// - Cumple principios de accesibilidad y ética
// ============================================================================

export function implicitConsent(req, res, next) {
  // Consentimiento implícito por acción consciente
  res.locals._implicitConsent = {
    tool: "interpreter",
    acceptedAt: new Date().toISOString(),
    inputType: req.body?.inputType || "unknown",
    mode: req.body?.mode || "audiencia",
  };

  next();
}
