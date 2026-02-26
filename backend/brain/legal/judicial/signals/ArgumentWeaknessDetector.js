/**
 * Detecta debilidades argumentativas
 * - NO reescribe el escrito
 * - SOLO etiqueta + sugiere corrección (cuando aplica)
 */

function snippet(text, i, len = 180) {
  if (i < 0) return null;
  const start = Math.max(0, i - 40);
  return text.slice(start, Math.min(text.length, start + len)).trim();
}

export function detectArgumentWeaknesses(text, { docType, jurisdiction } = {}) {
  const t = String(text || "");
  const out = [];

  // 1) Falta nexo causal
  const hasCausal =
    /(por\s+ello|por\s+tanto|en\s+consecuencia|de\s+modo\s+que|as[ií]\s+se\s+acredita|lo\s+que\s+demuestra)/i.test(t);
  if (!hasCausal) {
    out.push({
      code: "NO_CAUSAL_LINK",
      label: "Falta nexo causal explícito",
      severity: "media",
      evidenceSnippet: null,
      suggestion:
        "Añade un puente lógico: hechos → norma aplicable → consecuencia jurídica (ej.: “Por ello, conforme al art. X, corresponde…”).",
    });
  }

  // 2) No hay norma citada
  const hasNorm =
    /(art\.?\s*\d+|artículo\s*\d+|ley\s+\d+|c\.p\.c\.|l\.e\.c\.|c\.p\.c\.f\.)/i.test(t);
  if (!hasNorm) {
    out.push({
      code: "NO_NORM_CITED",
      label: "No hay norma citada",
      severity: "alta",
      evidenceSnippet: null,
      suggestion:
        "Cita el sustento normativo mínimo: artículo(s) aplicable(s) + norma procesal pertinente (competencia, procedencia, carga de la prueba).",
    });
  }

  // 3) No hay motivación explícita
  const hasMotiv =
    /(motivaci[oó]n|fundamenta|se\s+justifica|corresponde\s+)|por\s+tanto|en\s+consecuencia/i.test(t);
  if (!hasMotiv) {
    out.push({
      code: "NO_MOTIVATION",
      label: "No hay motivación explícita",
      severity: "alta",
      evidenceSnippet: null,
      suggestion:
        "Incluye motivación: premisas fácticas verificables + premisas normativas + inferencia clara (evita saltos).",
    });
  }

  // 4) Pretensión difusa
  const hasPet =
    /(petitorio|pretensi[oó]n|solicito|pido|se\s+declare|interpone|demando)/i.test(t);
  if (!hasPet) {
    out.push({
      code: "UNCLEAR_PRETENSION",
      label: "Pretensión no identificable",
      severity: "media",
      evidenceSnippet: null,
      suggestion:
        "Formula la pretensión en una frase operativa: verbo decisorio (declarar/fijar/ordenar) + objeto + alcance.",
    });
  }

  return out;
}