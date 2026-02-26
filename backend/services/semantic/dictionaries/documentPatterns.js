// ============================================================
// 🗂️ DOCUMENT_PATTERNS — Motor Semántico Jurídico v2
// ------------------------------------------------------------
// - Optimizado para robustez lingüística
// - Compatible con texto normalizado (CLEAN)
// ============================================================

const TOKENS = {
  VERB_ROOTS:
    "analiz|revis|examin|audit|evalu|cotej|escruti|estudi|proces|verific|contrast",

  OBJECTS:
    "documento|texto|escrito|resolucion|demanda|auto|pieza|contenido|expediente|anexo|dictamen",

  DEICTICS:
    "este|esta|el presente|la presente|dicho|citado|adjunto|mencionado|referido",

  INTERROGATIVES:
    "como|que|cual|explicame|explica|donde",

  CONCEPTUAL_TERMS:
    "analiz|metodolog|procedimient|estructura|teoria|concepto|pasos"
};

// ------------------------------------------------------------
// PATRONES COMPILADOS
// ------------------------------------------------------------

export const DOCUMENT_PATTERNS = {

  directiveVerb:
    new RegExp(`\\b(${TOKENS.VERB_ROOTS})\\w*\\b`, "i"),

  theoreticalQuestion:
    new RegExp(
      `\\b(${TOKENS.INTERROGATIVES})\\b[\\s\\S]{0,80}\\b(${TOKENS.CONCEPTUAL_TERMS})\\w*\\b`,
      "i"
    ),

  deicticReference:
    new RegExp(
      `\\b(${TOKENS.DEICTICS})\\b\\s+(?:el\\s+|la\\s+)?\\b(${TOKENS.OBJECTS})\\b`,
      "i"
    ),

  pointerSyntax:
    /\b(esto|continuacion|siguiente|in[\s\-]*fine)\b\s*(?:[:.\-–—]{1,3})\s*/i,

  explicitAttachmentRef:
    /\b(adjunto|archivo|anexo)\b/i
};