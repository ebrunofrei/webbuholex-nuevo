// ============================================================
// 🎯 Intent Registry — Canonical Source of Truth
// ------------------------------------------------------------
// - Enum centralizado
// - Clasificación por tipo
// - Validación segura
// ============================================================

export const INTENT_TYPES = {
  INTERNAL: "internal",
  EXTERNAL: "external"
};

// ------------------------------------------------------------
// Registro Canónico
// ------------------------------------------------------------

export const INTENT_REGISTRY = {

  // 🧠 Internos (no ejecutan acciones externas)
  DOCUMENT_REVIEW: {
    key: "document.review",
    type: INTENT_TYPES.INTERNAL,
    requiresPayload: true,
  },

  DEEP_ANALYSIS: {
    key: "analysis.deep",
    type: INTENT_TYPES.INTERNAL,
    requiresPayload: false,
  },

  // ⚙️ Externos (ejecutan acciones reales)
  AGENDA_CREATE: {
    key: "agenda.create",
    type: INTENT_TYPES.EXTERNAL,
    requiresPayload: true,
  },

  DOCUMENT_GENERATE: {
    key: "document.generate",
    type: INTENT_TYPES.EXTERNAL,
    requiresPayload: true,
  }

};

// ------------------------------------------------------------
// Helper: Validar Intent
// ------------------------------------------------------------

export function getIntentConfig(intentKey) {
  return Object.values(INTENT_REGISTRY).find(
    intent => intent.key === intentKey
  ) || null;
}

// ------------------------------------------------------------
// Helper: Verificar si es externo
// ------------------------------------------------------------

export function isExternalIntent(intentKey) {
  const config = getIntentConfig(intentKey);
  return config?.type === INTENT_TYPES.EXTERNAL;
}

// ------------------------------------------------------------
// Helper: Verificar si es válido
// ------------------------------------------------------------

export function isValidIntent(intentKey) {
  return Boolean(getIntentConfig(intentKey));
}