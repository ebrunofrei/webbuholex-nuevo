// ============================================================================
// 🧩 textHelpers — Utilidades puras
// No contienen lógica jurídica, solo helpers reutilizables
// ============================================================================

export function normalizeText(text = "") {
  return text.replace(/\s+/g, " ").trim();
}

export function hasLegalCitation(text = "") {
  return /(art\.?|artículo|ley|código|c\.p\.|c\.p\.c\.|l\.e\.c\.)/i.test(text);
}

export function hasMotivation(text = "") {
  return /(motivación|fundamentación|por cuanto|considerando)/i.test(text);
}

export function hasCausalLink(text = "") {
  return /(porque|debido a|en consecuencia|por tanto|en razón de)/i.test(text);
}

export function detectExcessiveAdjectives(text = "") {
  return /(muy|claramente|evidentemente|absolutamente|gravísimo)/i.test(text);
}
// ===================== NUEVOS HELPERS =====================

export function splitParagraphs(text = "") {
  return String(text || "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function splitSentences(text = "") {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (!t) return [];
  // corte simple (evita romper abreviaturas típicas)
  return t
    .split(/(?<=[\.\?\!])\s+(?=[A-ZÁÉÍÓÚÑ])/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);
}