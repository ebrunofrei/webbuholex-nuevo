// ============================================================================
// 🫧 bubbleClassifier — R7.7++ (Refined)
// ----------------------------------------------------------------------------
// Operational classifier for Bubble responses.
// - DOES NOT infer user intent
// - DOES NOT judge legality
// - Used ONLY for quota / plan management
// ============================================================================

function normalize(text = "") {
  return String(text).toLowerCase();
}

// --------------------------------------------------
// Length thresholds (more conservative)
// --------------------------------------------------
const LENGTH_THRESHOLDS = {
  casual: 500,              // conversación / explicación ligera
  academic: 1200,           // explicación académica extensa
  advanced: 2200,           // análisis jurídico profundo
};

// --------------------------------------------------
// Marker sets
// --------------------------------------------------
const ACADEMIC_MARKERS = [
  "en términos generales",
  "se entiende por",
  "concepto",
  "doctrina",
  "de manera general",
  "en abstracto",
  "explicación",
];

const LEGAL_REASONING_MARKERS = [
  "ratio decidendi",
  "fundamento jurídico",
  "fundamentos jurídicos",
  "criterio jurisprudencial",
  "precedente",
  "tribunal",
  "corte",
  "sala",
  "artículo",
  "norma",
  "interpretación",
];

const ADVANCED_MARKERS = [
  "aplicar al caso",
  "en el presente caso",
  "estrategia",
  "curso de acción",
  "riesgo procesal",
  "probabilidad de éxito",
  "recomendación",
  "conviene",
  "corresponde",
  "debería",
  "defensa",
];

// --------------------------------------------------
// Main classifier
// --------------------------------------------------
export function classifyBubbleResponse({
  reply = "",
  pdfJurisContext = null,
  jurisSeleccionada = null,
}) {
  const text = normalize(reply);
  const length = text.length;

  const hasAcademicTone = ACADEMIC_MARKERS.some((m) =>
    text.includes(m)
  );

  const hasLegalReasoning = LEGAL_REASONING_MARKERS.some((m) =>
    text.includes(m)
  );

  const hasAdvancedSignals = ADVANCED_MARKERS.some((m) =>
    text.includes(m)
  );

  // --------------------------------------------------
  // 1. Advanced legal analysis (LIMITED)
  // --------------------------------------------------
  if (
    (pdfJurisContext || jurisSeleccionada) &&
    hasLegalReasoning &&
    hasAdvancedSignals
  ) {
    return "advanced_analysis";
  }

  if (
    hasAdvancedSignals &&
    hasLegalReasoning &&
    length > LENGTH_THRESHOLDS.advanced
  ) {
    return "advanced_analysis";
  }

  // --------------------------------------------------
  // 2. Legal analysis (DESCRIPTIVE / ACADEMIC)
  // --------------------------------------------------
  if (hasLegalReasoning || length > LENGTH_THRESHOLDS.academic) {
    return "legal_analysis";
  }

  // --------------------------------------------------
  // 3. Academic explanation (FREE)
  // --------------------------------------------------
  if (hasAcademicTone || length > LENGTH_THRESHOLDS.casual) {
    return "academic_explanation";
  }

  // --------------------------------------------------
  // 4. Casual / conversational
  // --------------------------------------------------
  return "simple";
}

export default classifyBubbleResponse;
