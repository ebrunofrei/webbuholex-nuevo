// ============================================================================
// 🧠 LogicalCoherenceEngine — Razonamiento jurídico: coherencia lógica
// ----------------------------------------------------------------------------
// - Backend-first
// - No reescribe el texto: solo diagnostica + sugiere correcciones
// - Detecta: estructura argumentativa, conectores, conclusión, motivación, norma
// ============================================================================

import {
  splitParagraphs,
  hasLegalCitation,
  hasMotivation,
  hasCausalLink,
  normalizeText,
  detectExcessiveAdjectives,
} from "../text/textHelpers.js";

const CONNECTORS = [
  "por tanto",
  "en consecuencia",
  "por consiguiente",
  "de modo que",
  "así pues",
  "en razón de",
  "debido a",
  "porque",
  "pues",
  "considerando",
];

const CONCLUSION_MARKERS = [
  "en conclusión",
  "por tanto",
  "en consecuencia",
  "se concluye",
  "debe declararse",
  "corresponde",
];

const THESIS_MARKERS = ["solicito", "pretendo", "petitorio", "pido", "demando"];

export function analyzeLogicalCoherence(raw = "", opts = {}) {
  const text = String(raw || "");
  const clean = normalizeText(text);

  if (!clean || clean.length < 40) {
    return {
      score: 0,
      label: "Texto insuficiente",
      findings: ["Texto demasiado corto para análisis lógico."],
      suggestions: [],
      metrics: {},
    };
  }

  const paragraphs = splitParagraphs(text);
  const lc = clean.toLowerCase();

  const hasThesis = THESIS_MARKERS.some((m) => lc.includes(m));
  const hasConclusion = CONCLUSION_MARKERS.some((m) => lc.includes(m));
  const hasConnectors = CONNECTORS.some((c) => lc.includes(c));

  const citations = hasLegalCitation(text);
  const motivation = hasMotivation(text);
  const causal = hasCausalLink(text);

  const adjectiveRisk = detectExcessiveAdjectives(text);

  // “Saltos” típicos: conclusión sin nexo, petición sin motivación, etc.
  const findings = [];
  const suggestions = [];

  if (!hasThesis) {
    findings.push("No se detecta tesis o pretensión formulada con claridad.");
    suggestions.push(
      "Incluye una tesis explícita (qué se pide y sobre qué base) en una oración breve al inicio del escrito."
    );
  }

  if (!citations) {
    findings.push("No se detecta cita normativa (artículos, código, ley).");
    suggestions.push(
      "Añade fundamento normativo mínimo: artículo(s) aplicable(s) y cuerpo legal correspondiente."
    );
  }

  if (!motivation) {
    findings.push("No se detecta motivación explícita (considerandos o fundamentación).");
    suggestions.push(
      "Incorpora motivación: hechos relevantes → norma aplicable → subsunción → conclusión."
    );
  }

  if (!causal) {
    findings.push("Falta nexo causal o conectores de inferencia entre hechos y conclusión.");
    suggestions.push(
      "Introduce conectores causales: 'debido a', 'en razón de', 'por tanto' para justificar el salto inferencial."
    );
  }

  if (!hasConnectors) {
    findings.push("Argumentación con baja densidad de conectores lógicos.");
    suggestions.push(
      "Aumenta conectores lógicos para hacer explícita la cadena argumental."
    );
  }

  if (!hasConclusion) {
    findings.push("No se identifica un cierre conclusivo claro.");
    suggestions.push(
      "Cierra con una conclusión expresa: 'Por tanto, corresponde declarar…' y vincúlala con la norma."
    );
  }

  if (adjectiveRisk) {
    findings.push("Redacción con riesgo de vaguedad por intensificadores/adjetivos.");
    suggestions.push(
      "Reduce adjetivos y refuerza con hechos verificables, fechas, actos procesales y citas normativas."
    );
  }

  // Score: ponderado, estable
  const metrics = {
    hasThesis,
    hasConclusion,
    hasConnectors,
    hasCitations: citations,
    hasMotivation: motivation,
    hasCausalLink: causal,
    paragraphs: paragraphs.length,
  };

  const score = computeCoherenceScore(metrics);
  const label =
    score >= 82 ? "Estructura sólida" : score >= 61 ? "Estructura incompleta" : "Estructura débil";

  // “Modo Revisor de Corte” (opcional)
  const courtReview = opts.courtReview
    ? runCourtReviewerHeuristics(text)
    : null;

  return {
    score,
    label,
    findings,
    suggestions,
    metrics,
    courtReview,
  };
}

function computeCoherenceScore(m) {
  let s = 40;

  if (m.hasThesis) s += 12;
  if (m.hasCitations) s += 15;
  if (m.hasMotivation) s += 12;
  if (m.hasCausalLink) s += 10;
  if (m.hasConnectors) s += 6;
  if (m.hasConclusion) s += 10;

  // Bonus por estructura mínima
  if (m.paragraphs >= 4) s += 5;

  // clamp
  return Math.max(0, Math.min(100, s));
}

function runCourtReviewerHeuristics(text) {
  const t = text.toLowerCase();

  const vague = [
    "de alguna manera",
    "parece",
    "podría",
    "sería",
    "se entiende",
    "en cierto modo",
    "aproximadamente",
  ];

  const excessiveAdj = /(muy|claramente|evidentemente|absolutamente|gravísimo)/i.test(text);

  const vagueHits = vague.filter((w) => t.includes(w));

  const issues = [];
  const tips = [];

  if (vagueHits.length) {
    issues.push("Redacción vaga o ambigua detectada.");
    tips.push(
      "Sustituye vaguedades por hechos: fechas, actos, documentos, resoluciones, folios; evita 'parece'/'podría'."
    );
  }

  if (excessiveAdj) {
    issues.push("Exceso de intensificadores/adjetivos (riesgo de subjetividad).");
    tips.push("Cambia adjetivos por indicadores objetivos (hechos, documentos, norma y jurisprudencia).");
  }

  return {
    issues,
    tips,
    signals: {
      vagueTerms: vagueHits,
      excessiveAdjectives: excessiveAdj,
    },
  };
}