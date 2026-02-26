/**
 * Modo "Revisor de Corte"
 * - Detecta vaguedad, ambigüedad, exceso de adjetivos
 * - NO cambia el texto
 */

const VAGUE = [
  "claramente",
  "evidentemente",
  "obviamente",
  "sin duda",
  "de alguna manera",
  "en cierto modo",
  "sumamente",
  "totalmente",
  "absolutamente",
];

const EXCESSIVE_ADJ = [
  "flagrante",
  "grosero",
  "escandaloso",
  "inaceptable",
  "inadmisible",
  "arbitrario",
  "ilegalísimo",
];

export function detectCourtStyleFindings(text) {
  const t = String(text || "").toLowerCase();
  const out = [];

  for (const w of VAGUE) {
    if (t.includes(w)) {
      out.push({
        code: "VAGUE_LANGUAGE",
        label: "Redacción vaga o conclusiva sin sustento",
        examples: [w],
      });
      break;
    }
  }

  for (const a of EXCESSIVE_ADJ) {
    if (t.includes(a)) {
      out.push({
        code: "EXCESSIVE_ADJECTIVES",
        label: "Exceso de adjetivación valorativa",
        examples: [a],
      });
      break;
    }
  }

  // Ambigüedad típica: “lo mismo”, “ello”, “esto” sin referencia
  const ambiguousPronouns = /(ello|esto|lo\s+mismo)\b/i.test(text);
  if (ambiguousPronouns) {
    out.push({
      code: "AMBIGUOUS_REFERENCES",
      label: "Referencias ambiguas",
      examples: ["ello/esto/lo mismo"],
    });
  }

  return out;
}