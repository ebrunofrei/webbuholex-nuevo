// ============================================================
// ⚖️ JurisLex: Diccionario Semántico de Latinismos (Enterprise)
// ------------------------------------------------------------
// - Categorización por dominio procesal
// - Pesos académicos para Score Engine
// - Generador de regex seguro
// ============================================================

export const LATIN_LEXICON = {
  HERMENEUTICA: {
    terms: [
      "ratio decidendi",
      "obiter dictum",
      "lex specialis",
      "lex posterior",
      "ius cogens",
      "stare decisis"
    ],
    weight: 1.5,
    category: "interpretacion_juridica"
  },

  GARANTIAS: {
    terms: [
      "in dubio pro reo",
      "non bis in idem",
      "onus probandi",
      "habeas corpus",
      "nullum crimen sine lege"
    ],
    weight: 1.8,
    category: "derecho_procesal"
  },

  EFECTOS: {
    terms: [
      "erga omnes",
      "inter partes",
      "res iudicata",
      "ex tunc",
      "ex nunc"
    ],
    weight: 1.2,
    category: "alcance_legal"
  },

  CONGRUENCIA: {
    terms: [
      "ultra petita",
      "extra petita",
      "citra petita",
      "infra petita"
    ],
    weight: 2.0,
    category: "vicios_procesales"
  },

  OBLIGACIONES: {
    terms: [
      "pacta sunt servanda",
      "rebus sic stantibus",
      "bona fide",
      "culpa in contrahendo"
    ],
    weight: 1.3,
    category: "derecho_civil"
  }
};

// ============================================================
// 🔧 Helpers avanzados
// ============================================================

/**
 * Devuelve todos los términos planos
 */
export function getAllLatinTermsFlat() {
  return Object.values(LATIN_LEXICON)
    .flatMap(group => group.terms);
}

/**
 * Devuelve un regex seguro listo para usar
 */
export function buildLatinRegex() {
  const escaped = getAllLatinTermsFlat()
    .map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

  return new RegExp(`\\b(${escaped.join("|")})\\b`, "i");
}

/**
 * Calcula score ponderado por ocurrencias
 */
export function computeLatinScore(text = "") {
  const lower = text.toLowerCase();
  let score = 0;

  for (const group of Object.values(LATIN_LEXICON)) {
    for (const term of group.terms) {
      if (lower.includes(term)) {
        score += group.weight;
      }
    }
  }

  return score;
}