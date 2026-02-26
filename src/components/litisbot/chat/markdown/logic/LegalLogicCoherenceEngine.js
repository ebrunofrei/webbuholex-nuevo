// ============================================================================
// 🧠 LegalLogicCoherenceEngine — Coherencia lógica estructural adaptativa
// ----------------------------------------------------------------------------
// - NO UI
// - NO formatea texto
// - Extrae claims
// - Evalúa estructura, conectores, narrativa mínima y carga probatoria
// - Ajusta score según tipo documental (docType)
// ============================================================================

import { classifyLegalDocument } from "../LegalDocumentClassifier";

/* ============================================================================
   CONFIG
============================================================================ */

const DEFAULTS = {
  minLen: 900,
  strict: false,
};

const CONNECTORS = [
  "por tanto",
  "en consecuencia",
  "por consiguiente",
  "así las cosas",
  "de ahí que",
  "en virtud de",
  "debido a",
  "dado que",
  "en razón de",
];

const STRUCT_MARKERS = [
  "petitorio",
  "fundamentos",
  "hecho",
  "derecho",
  "agravio",
  "considerando",
  "resuelve",
];

/* ============================================================================
   UTILIDADES
============================================================================ */

function norm(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .trim();
}

function toUpper(s) {
  return norm(s).toUpperCase();
}

function splitSentences(raw) {
  const text = norm(raw);

  return text
    .split(/(?<=[\.\?\!])\s+(?=[A-ZÁÉÍÓÚÑ])/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

function extractDates(rawUpper) {
  const dates = rawUpper.match(
    /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b/g
  );
  return dates ? Array.from(new Set(dates)) : [];
}

function extractParties(rawUpper) {
  const hits = [];
  const patterns = [
    /\bDEMANDANTE\b[:\s]+([A-ZÁÉÍÓÚÑ\s]{3,80})/g,
    /\bDEMANDADO\b[:\s]+([A-ZÁÉÍÓÚÑ\s]{3,80})/g,
    /\bRECURRENTE\b[:\s]+([A-ZÁÉÍÓÚÑ\s]{3,80})/g,
  ];

  for (const p of patterns) {
    let m;
    while ((m = p.exec(rawUpper))) {
      const name = norm(m[1]).slice(0, 80);
      if (name) hits.push(name);
    }
  }

  return Array.from(new Set(hits));
}

function extractClaims(sentencesUpper) {
  const verbs = [
    "SOLICITO",
    "PRETENDO",
    "CORRESPONDE",
    "PROCEDE",
    "ACREDITA",
    "DEBE",
    "CONFIGURA",
    "SEÑALA",
    "SOSTENGO",
    "IMPUGNO",
  ];

  const legalTokens = [
    "ART",
    "ARTÍCULO",
    "CÓDIGO",
    "LEY",
    "JURISPRUDENCIA",
    "NULIDAD",
    "DAÑO",
    "OBLIGACIÓN",
    "CONTRATO",
    "POSESIÓN",
    "PRUEBA",
  ];

  const claims = [];

  for (const s of sentencesUpper) {
    const hasVerb = verbs.some((v) => s.includes(v));
    const hasLegal = legalTokens.some((t) => s.includes(t));
    if (hasVerb || hasLegal) claims.push(s);
  }

  return claims.slice(0, 40);
}

/* ============================================================================
   PERFIL ESTRUCTURAL SEGÚN TIPO DOCUMENTAL
============================================================================ */

function getStructuralProfile(docType) {
  const profiles = {
    resolucion: {
      weightStructure: 1.2,
      weightEvidence: 1.1,
      tolerance: 0.9,
    },
    demanda: {
      weightStructure: 1.0,
      weightEvidence: 1.2,
      tolerance: 1.0,
    },
    apelacion: {
      weightStructure: 1.1,
      weightEvidence: 1.3,
      tolerance: 0.85,
    },
    informe: {
      weightStructure: 0.9,
      weightEvidence: 0.8,
      tolerance: 1.1,
    },
    general: {
      weightStructure: 1.0,
      weightEvidence: 1.0,
      tolerance: 1.0,
    },
  };

  return profiles[docType] || profiles.general;
}

/* ============================================================================
   SCORE BASE
============================================================================ */

function scorePresence(rawUpper) {
  const hasConnectors = CONNECTORS.some((c) =>
    rawUpper.includes(c.toUpperCase())
  );

  const markersFound = STRUCT_MARKERS.filter((m) =>
    rawUpper.includes(m.toUpperCase())
  ).length;

  let score = 100;
  const issues = [];
  const suggestions = [];

  if (!hasConnectors) {
    score -= 18;
    issues.push("No se detectan conectores lógicos explícitos.");
    suggestions.push(
      "Incluya conectores como 'por tanto', 'en consecuencia' para explicitar inferencias."
    );
  }

  if (markersFound === 0) {
    score -= 15;
    issues.push("No se detectan marcadores mínimos de estructura argumentativa.");
    suggestions.push(
      "Introduzca secciones como Petitorio / Fundamentos / Considerando."
    );
  } else if (markersFound === 1) {
    score -= 8;
    issues.push("Estructura mínima detectada pero insuficiente.");
    suggestions.push(
      "Diferencie hechos, derecho y conclusión en bloques separados."
    );
  }

  return { score, issues, suggestions };
}

/* ============================================================================
   FUNCIÓN PRINCIPAL
============================================================================ */

export function analyzeLegalLogicCoherence(raw = "", config = {}) {
  const cfg = { ...DEFAULTS, ...(config || {}) };

  const text = norm(raw);
  if (!text || text.length < cfg.minLen) return null;

  const docType = classifyLegalDocument(text);
  const profile = getStructuralProfile(docType);

  const upper = toUpper(text);
  const sentences = splitSentences(text);
  const sentencesUpper = sentences.map(toUpper);

  const parties = extractParties(upper);
  const dates = extractDates(upper);
  const claims = extractClaims(sentencesUpper);

  const base = scorePresence(upper);

  let score = base.score;
  const issues = [...base.issues];
  const suggestions = [...base.suggestions];

  /* ============================
     Penalizaciones estructurales
  ============================ */

  if (parties.length === 0) {
    score -= 10 * profile.weightStructure;
    issues.push("No se identifican partes procesales explícitas.");
    suggestions.push(
      "Identifique demandante/demandado o recurrente al inicio."
    );
  }

  if (dates.length === 0) {
    score -= 6 * profile.weightStructure;
    issues.push("No se identifican fechas relevantes.");
    suggestions.push(
      "Incluya fechas para reforzar la secuencia causal."
    );
  }

  const hasEvidence =
    upper.includes("PRUEBA") ||
    upper.includes("ANEXO") ||
    upper.includes("MEDIO PROBATORIO");

  if (!hasEvidence) {
    score -= 8 * profile.weightEvidence;
    issues.push("No se detecta soporte probatorio explícito.");
    suggestions.push(
      "Vincule hechos a medios probatorios para robustecer inferencia fáctica."
    );
  }

  score *= profile.tolerance;

  if (score < 0) score = 0;
  if (score > 100) score = 100;

  return {
    type: "coherence",
    docType,
    coherenceScore: Math.round(score),
    parties,
    dates,
    claims,
    issues,
    suggestions,
  };
}