// ============================================================================
// ⚖️ LegalActionsCatalog — Catálogo canónico de acciones jurídicas (C.3.1)
// ----------------------------------------------------------------------------
// - Define acciones permitidas
// - Describe intención, riesgo y confirmación
// - No ejecuta nada
// ============================================================================

export const LEGAL_ACTIONS = {
  EXPORT_WORD: {
    type: "EXPORT_WORD",
    label: "Exportar a Word",
    description:
      "Genera un documento editable a partir del análisis actual.",
    requiresConfirm: true,
    riskLevel: "low",
    snapshotBefore: true,
  },

  EXPORT_PDF: {
    type: "EXPORT_PDF",
    label: "Exportar a PDF",
    description:
      "Genera un documento PDF del análisis para revisión o archivo.",
    requiresConfirm: true,
    riskLevel: "low",
    snapshotBefore: true,
  },

  SAVE_DRAFT: {
    type: "SAVE_DRAFT",
    label: "Guardar borrador",
    description:
      "Guarda un punto del análisis para retomarlo más adelante.",
    requiresConfirm: true,
    riskLevel: "none",
    snapshotBefore: true,
  },

  OPEN_DRAFTS: {
    type: "OPEN_DRAFTS",
    label: "Ver borradores",
    description:
      "Revisar y continuar análisis previos.",
    requiresConfirm: false,
    riskLevel: "none",
  },

  REHYDRATE_DRAFT: {
    type: "REHYDRATE_DRAFT",
    label: "Continuar desde este borrador",
    description:
      "El estado actual del chat será reemplazado por este análisis previo.",
    requiresConfirm: true,
    riskLevel: "medium",
  },
};
