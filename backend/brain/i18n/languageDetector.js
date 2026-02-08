// =====================================================================
// 🌐 languageDetector.js — R7.6++
// Multilingual input detector (lightweight, deterministic).
// Detects: es, en, pt, fr, it, de
// Fallback: en
//
// INTERNAL MODULE — DO NOT EXPOSE TO LLM
// =====================================================================

const LANG_REGEX = {
  es: /[áéíóúñ¿¡]|(que|como|cuando|donde|porque|recurso|juez|demanda)/i,
  en: /\b(the|and|or|what|why|how|court|motion|claim|judge)\b/i,
  pt: /\b(ção|que|como|porque|juiz|recurso|ação)\b/i,
  fr: /\b(que|pourquoi|comment|tribunal|juge|plainte|procédure)\b/i,
  it: /\b(perché|come|tribunale|giudice|ricorso|domanda)\b/i,
  de: /\b(warum|wie|gericht|richter|klage|verfahren)\b/i,
};

/**
 * Detects the most likely language of the input text.
 * @param {string} text 
 * @returns {string} locale code (es|en|pt|fr|it|de)
 */
export function detectLanguage(text = "") {
  const t = String(text).trim().toLowerCase();
  if (!t) return "en"; // safe fallback

  for (const [lang, regex] of Object.entries(LANG_REGEX)) {
    if (regex.test(t)) return lang;
  }

  return "en"; // default global fallback
}

export default detectLanguage;
