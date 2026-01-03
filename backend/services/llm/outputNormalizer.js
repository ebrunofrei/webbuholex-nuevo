// ======================================================================
// 🧾 OUTPUT NORMALIZER – WORD SAFE
// ----------------------------------------------------------------------
// Normaliza respuestas para exportación (Word / PDF / texto plano)
// ======================================================================

export function normalizarRespuestaWord(texto = "") {
  if (!texto || typeof texto !== "string") return "";

  let t = texto;
  t = t.replace(/^#{1,6}\s*/gm, "");
  t = t.replace(/^\s*[-*]\s+/gm, "");
  t = t.replace(/`{1,3}([^`]+)`{1,3}/g, "$1");
  t = t.replace(/\n{3,}/g, "\n\n");
  t = t.replace(/[ \t]+$/gm, "");

  return t.trim();
}
