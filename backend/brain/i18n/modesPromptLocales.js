// ============================================================================
// 🌐 MODES PROMPT LOCALES — R7.7++
// ---------------------------------------------------------------------------
// Human-facing operational modes (multilingual).
// INTERNAL RULES:
// - Modes NEVER affect legal reasoning engine.
// - They ONLY affect visible explanation style.
// - Kernel chooses mode, not the model.
//
// STRUCTURE:
// mode = {
//   focus: "...",
//   priority: "...",
//   boundaries: "...",
//   output: "..."
// }
//
// ============================================================================

export const MODES_PROMPT_LOCALES = {
  /* ============================================================
     🇪🇸 SPANISH — Latino neutro
  ============================================================ */
  es: {
    litigante: `
MODO LITIGANTE (ES):
• Enfoque: estrategia procesal y probatoria.
• Prioridad: qué hacer, cómo hacerlo y en qué plazo.
• Límites: no academicismo innecesario.
• Salida: recomendaciones claras, riesgos y rutas accionables.
`.trim(),

    doctrinal: `
MODO DOCTRINAL (ES):
• Enfoque: estructura conceptual y fundamentos.
• Prioridad: explicar institutos sin perder utilidad práctica.
• Límites: evitar erudición irrelevante.
• Salida: claridad conceptual con anclaje operativo.
`.trim(),

    analitico: `
MODO ANALÍTICO (ES):
• Enfoque: desmontar el problema en piezas lógicas.
• Prioridad: consistencia, premisas, inferencias y vacíos.
• Límites: no perder dirección estratégica.
• Salida: radiografía lógica del asunto.
`.trim(),
  },

  /* ============================================================
     🇺🇸 ENGLISH — International Legal English
  ============================================================ */
  en: {
    litigante: `
LITIGATION MODE (EN):
• Focus: procedural and evidentiary impact.
• Priority: actionable steps, timing, risks.
• Boundaries: avoid unnecessary doctrine.
• Output: strategic, concise, outcome-oriented.
`.trim(),

    doctrinal: `
DOCTRINAL MODE (EN):
• Focus: legal constructs, rationale, structure.
• Priority: conceptual clarity with applied relevance.
• Boundaries: avoid excessive abstraction.
• Output: structured explanation grounded in practice.
`.trim(),

    analitico: `
ANALYTICAL MODE (EN):
• Focus: logical structure, premises, consistency.
• Priority: identify gaps, contradictions, rationale.
• Boundaries: avoid strategic drift.
• Output: high-precision reasoning map.
`.trim(),
  },

  /* ============================================================
     🇵🇹 PORTUGUÊS — (Base stable, expandable)
  ============================================================ */
  pt: {
    litigante: `
MODO LITIGANTE (PT):
• Foco: impacto processual e probatório.
• Prioridade: ações claras e riscos.
• Saída: orientação prática e objetiva.
`.trim(),

    doctrinal: `
MODO DOUTRINAL (PT):
• Foco: fundamentos e estruturas jurídicas.
• Limite: evitar detalhamento inútil.
• Saída: explicação conceitual aplicável.
`.trim(),

    analitico: `
MODO ANALÍTICO (PT):
• Foco: avaliação lógica e estrutural.
• Saída: identificação de premissas e falhas.
`.trim(),
  },
};

// ============================================================================
// PUBLIC API — Locale + Mode selector (canonical)
// ============================================================================
export function getModePromptLocale(locale = "es", mode = "litigante") {
  const loc = MODES_PROMPT_LOCALES[locale] || MODES_PROMPT_LOCALES["en"];
  return loc[mode] || loc["litigante"];
}

export default MODES_PROMPT_LOCALES;
