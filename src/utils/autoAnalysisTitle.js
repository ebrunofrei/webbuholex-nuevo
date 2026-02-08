// ============================================================
// 🧠 autoAnalysisTitle — Heurística jurídica (CANÓNICA)
// ------------------------------------------------------------
// - NO IA
// - Determinista
// - Jurídico-grade
// ============================================================

const STOP_WORDS = [
  "hola", "litis", "empezamos", "comenzamos", "ahora",
  "hoy", "vamos", "quiero", "deseo", "analizar",
  "analisis", "análisis", "conversacion", "conversación",
  "sobre", "acerca", "del", "de", "la", "el", "los", "las",
  "un", "una", "en", "y", "por", "para", "mi", "me",
  "codigo", "código"
];

const KEY_PATTERNS = [
  { regex: /peculado/i, title: "Delito de Peculado" },
  { regex: /colusi[oó]n/i, title: "Delito de Colusión" },
  { regex: /negociaci[oó]n incompatible/i, title: "Negociación Incompatible" },
  { regex: /funcionario p[uú]blico/i, title: "Responsabilidad del Funcionario Público" },
  { regex: /art[ií]culo\s+\d+/i, title: m => `Análisis del ${m[0]}` },
  { regex: /c[oó]digo penal/i, title: "Análisis de Código Penal" },
  { regex: /arist[oó]teles/i, title: "Justicia en Aristóteles" },
  { regex: /kant/i, title: "Justicia en Kant" },
  { regex: /derecho penal/i, title: "Derecho Penal" },
];

export function buildAutoAnalysisTitle(text = "") {
  if (!text || typeof text !== "string" || text.trim().length < 15) {
    return "Análisis jurídico";
  }

  const clean = text
    .toLowerCase()
    .replace(/[^\w\sáéíóúñ]/gi, " ");

  // 1️⃣ Prioridad: patrones jurídicos fuertes
  for (const p of KEY_PATTERNS) {
    const match = clean.match(p.regex);
    if (match) {
      return typeof p.title === "function"
        ? p.title(match)
        : p.title;
    }
  }

  // 2️⃣ Fallback: palabras significativas
  const words = clean
    .split(/\s+/)
    .filter(w =>
    w.length > 4 &&
    !STOP_WORDS.includes(w) &&
    !/^(hola|litis|comenzamos|empezamos)$/i.test(w)
    );

  if (words.length > 0) {
    return words
      .slice(0, 4)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  // 3️⃣ Último fallback
  return "Análisis jurídico";
}
