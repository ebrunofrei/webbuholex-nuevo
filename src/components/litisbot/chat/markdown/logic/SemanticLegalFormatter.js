/**
 * SemanticLegalFormatter
 * Normalización estructural ligera previa al motor editorial.
 */

export function semanticNormalize(text = "") {
  if (!text) return "";

  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+$/gm, "")
    .trim();
}