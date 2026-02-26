// ============================================================
// 🔧 Normalización Semántica Avanzada (v5 Enterprise)
// ------------------------------------------------------------
// - Tolerante a OCR / PDF corrupto
// - Conserva estructura útil
// - Limpia basura invisible
// - Segura para motor jurídico
// ============================================================

export const CLEAN = (str = "") => {
  if (typeof str !== "string") return "";

  return str
    // 1️⃣ Normalización Unicode
    .normalize("NFD")

    // 2️⃣ Eliminación de diacríticos
    .replace(/[\u0300-\u036f]/g, "")

    // 3️⃣ Limpieza de caracteres invisibles Unicode comunes en PDF/OCR
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // zero-width + BOM
    .replace(/\u00A0/g, " ")               // non-breaking space

    // 4️⃣ Normalización de saltos de línea (NO los elimina)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")

    // 5️⃣ Colapso de espacios múltiples (sin tocar saltos de línea)
    .replace(/[ \t]+/g, " ")

    // 6️⃣ Trim por línea (evita basura lateral)
    .split("\n")
    .map(line => line.trim())
    .join("\n")

    // 7️⃣ Minúsculas
    .toLowerCase()
    .trim();
};