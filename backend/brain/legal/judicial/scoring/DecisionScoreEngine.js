/**
 * 🏛️ DecisionScoreEngine — Versión Cognitiva 2.3 (DocType-aware + Auto-detección)
 * - Score 0–100
 * - Jurisprudencia 20–30% dinámico
 * - Penalización por contradicciones internas
 * - Riesgo procesal real
 * - Bonus por excelencia estructural
 * - Núcleo adaptable por docType
 * - Auto-detección de docType si no viene explícito
 * - Arquitectura explicable
 */

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function bucket(score) {
  if (score >= 80) return "alta";
  if (score >= 60) return "media";
  return "baja";
}

function dynamicJurisWeight(bestScore) {
  if (bestScore >= 0.9) return 0.30;
  if (bestScore >= 0.85) return 0.25;
  if (bestScore >= 0.8) return 0.20;
  return 0.10;
}

/* ========================================================= */
/* ==================== SEÑALES BASE ======================= */
/* ========================================================= */

function hasNormCitations(text) {
  return /(art\.?\s*\d+|artículo\s*\d+|ley\s+\d+|c\.p\.c\.|l\.e\.c\.|c\.p\.c\.f\.)/i.test(text);
}

function hasMotivation(text) {
  return /(por\s+ello|en\s+consecuencia|por\s+tanto|se\s+concluye|corresponde\s+)|motivaci[oó]n/i.test(text);
}

function hasPretension(text) {
  return /(petitorio|pretensi[oó]n|solicito|pido|interpone|demando|se\s+declare)/i.test(text);
}

function inferEvidenceMentions(text) {
  return /(anexo|prueba|documento|acta|pericia|informe|constancia|medio\s+probatorio)/i.test(text);
}

/* ========================================================= */
/* ==================== DOC TYPE =========================== */
/* ========================================================= */

/**
 * Normaliza docType a un set estable.
 */
function normalizeDocType(docType) {
  const dt = String(docType || "").trim().toLowerCase();
  if (!dt) return "default";

  // alias comunes
  if (/(demanda|interpone\s+demanda|demandante)/i.test(dt)) return "demanda";
  if (/(apelaci[oó]n|recurso\s+de\s+apelaci[oó]n)/i.test(dt)) return "apelacion";
  if (/(contestaci[oó]n|absuelv|oposici[oó]n)/i.test(dt)) return "contestacion";
  if (/(casaci[oó]n|recurso\s+de\s+casaci[oó]n)/i.test(dt)) return "casacion";

  return dt;
}

/**
 * Auto-detección heurística (v1) basada en patrones típicos.
 * Retorna: { docType, confidence, signals }
 */
function inferDocTypeFromText(text) {
  const t = String(text || "").toLowerCase();

  const scores = {
    demanda: 0,
    apelacion: 0,
    contestacion: 0,
    casacion: 0,
  };

  // DEMANDA
  if (/\b(interpone|interpongo)\s+demanda\b/.test(t)) scores.demanda += 4;
  if (/\b(demando|demanda)\b/.test(t)) scores.demanda += 2;
  if (/\bpetitorio\b/.test(t)) scores.demanda += 2;
  if (/\bse\s+declare\b/.test(t)) scores.demanda += 1;

  // APELACIÓN
  if (/\b(recurso\s+de\s+apelaci[oó]n|apelaci[oó]n)\b/.test(t)) scores.apelacion += 5;
  if (/\b(solicito\s+se\s+revoque|se\s+revoque|se\s+reforme)\b/.test(t)) scores.apelacion += 3;
  if (/\bagravio(s)?\b/.test(t)) scores.apelacion += 2;

  // CONTESTACIÓN
  if (/\b(contestaci[oó]n\s+de\s+la\s+demanda|contesto\s+la\s+demanda)\b/.test(t)) scores.contestacion += 5;
  if (/\b(absuelvo|absuelve|absuelven)\b/.test(t)) scores.contestacion += 2;
  if (/\b(niego|niega|niegan)\b/.test(t)) scores.contestacion += 2;
  if (/\bexcepci[oó]n(es)?\b/.test(t)) scores.contestacion += 2;

  // CASACIÓN
  if (/\b(recurso\s+de\s+casaci[oó]n|casaci[oó]n)\b/.test(t)) scores.casacion += 6;
  if (/\b(infracci[oó]n\s+normativa|quebrantamiento\s+de\s+forma)\b/.test(t)) scores.casacion += 3;
  if (/\binter[eé]s\s+casacional\b/.test(t)) scores.casacion += 3;

  // elegir el mejor
  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [topType, topScore] = entries[0];
  const secondScore = entries[1]?.[1] ?? 0;

  // confianza simple: diferencia relativa
  const confidence = topScore <= 0 ? 0 : clamp((topScore - secondScore) / Math.max(1, topScore), 0, 1);

  // si todo es flojo, devolvemos default
  if (topScore < 4) {
    return { docType: "default", confidence: 0, signals: scores };
  }

  return { docType: topType, confidence, signals: scores };
}

/**
 * Pesos del núcleo por tipo de documento.
 * Suman 1.0 (aprox).
 */
function getCoreWeightsByDocType(docType) {
  const matrix = {
    demanda: {
      pretension: 0.30,
      norma: 0.20,
      motivacion: 0.25,
      evidencia: 0.20,
      riesgo: 0.05,
    },
    apelacion: {
      pretension: 0.15,
      norma: 0.25,
      motivacion: 0.35,
      evidencia: 0.15,
      riesgo: 0.10,
    },
    contestacion: {
      pretension: 0.20,
      norma: 0.25,
      motivacion: 0.30,
      evidencia: 0.20,
      riesgo: 0.05,
    },
    casacion: {
      pretension: 0.10,
      norma: 0.35,
      motivacion: 0.40,
      evidencia: 0.05,
      riesgo: 0.10,
    },
    default: {
      pretension: 0.25,
      norma: 0.25,
      motivacion: 0.30,
      evidencia: 0.15,
      riesgo: 0.05,
    },
  };

  return matrix[docType] || matrix.default;
}

/* ========================================================= */
/* ==================== PENALIDADES ======================== */
/* ========================================================= */

function penaltyFromWeaknesses(weaknesses) {
  let total = 0;
  for (const w of weaknesses || []) {
    if (w.severity === "alta") total += 12;
    else if (w.severity === "media") total += 7;
    else total += 3;
  }
  return clamp(total, 0, 45);
}

function penaltyFromStyle(styleFindings) {
  const total = (styleFindings || []).length * 2.5;
  return clamp(total, 0, 12);
}

function penaltyFromContradictions(report) {
  if (!report?.summary) return 0;

  const { critical = 0, high = 0, medium = 0, low = 0 } = report.summary;

  const total =
    critical * 25 +
    high * 15 +
    medium * 8 +
    low * 3;

  return clamp(total, 0, 50);
}

function penaltyFromSemanticCoherence(report) {
  if (!report?.summary) return 0;

  const { critical = 0, high = 0, medium = 0, low = 0 } = report.summary;

  const total =
    critical * 22 +
    high * 14 +
    medium * 8 +
    low * 3;

  return clamp(total, 0, 45);
}

function computeProceduralRisk(report) {
  if (!report?.summary) return 1;

  const { critical = 0, high = 0 } = report.summary;

  if (critical > 0) return 0.4;
  if (high > 0) return 0.65;

  return 1;
}

/* ========================================================= */
/* ==================== BONUS EXCELENCIA =================== */
/* ========================================================= */

function excellenceBonus({
  baseScore,
  weaknesses,
  contradictions,
  bestJurisScore,
  sMotiv,
  sNorma,
}) {
  if (baseScore < 70) return 0;

  const hasCritical = contradictions?.summary?.critical > 0;
  const hasHighWeakness = (weaknesses || []).some((w) => w.severity === "alta");

  if (hasCritical) return 0;
  if (hasHighWeakness) return 0;
  if (!sMotiv || !sNorma) return 0;
  if (bestJurisScore < 0.85) return 0;

  if (bestJurisScore >= 0.92) return 8;
  if (bestJurisScore >= 0.88) return 6;
  return 3;
}

/* ========================================================= */
/* ==================== ENGINE PRINCIPAL =================== */
/* ========================================================= */

export function computeDecisionScore({
  text,
  docType,
  weaknesses = [],
  styleFindings = [],
  contradictions = null,
  semanticCoherence = null,
  jurisprudenceAlignment = null,
  useEmbeddingsForContradictions = true,
} = {}) {
  const source = String(text || "");

  // 1) DocType: si no viene (o viene "desconocido"), inferirlo
  const normalizedDocType = normalizeDocType(docType);
  const shouldInfer =
    !normalizedDocType ||
    normalizedDocType === "default" ||
    normalizedDocType === "desconocido" ||
    normalizedDocType === "unknown";

  const inferred = shouldInfer ? inferDocTypeFromText(source) : null;
  const finalDocType = shouldInfer ? inferred.docType : normalizedDocType;

  /* ==================== Señales binarias ==================== */

  const sPretension = hasPretension(source) ? 1 : 0;
  const sNorma = hasNormCitations(source) ? 1 : 0;
  const sMotiv = hasMotivation(source) ? 1 : 0;
  const sEvid = inferEvidenceMentions(source) ? 1 : 0;

  const bestJurisScore = jurisprudenceAlignment?.bestScore ?? 0;
  const sJuris = clamp(bestJurisScore, 0, 1);

  const wJuris = dynamicJurisWeight(sJuris);
  const wCore = 1 - wJuris;

  const proceduralRiskFactor = computeProceduralRisk(contradictions);

  /* ==================== Núcleo estructural (DocType-aware) ==================== */

  const weights = getCoreWeightsByDocType(finalDocType);

  const coreScore =
    (weights.pretension * sPretension) +
    (weights.norma * sNorma) +
    (weights.motivacion * sMotiv) +
    (weights.evidencia * sEvid) +
    (weights.riesgo * proceduralRiskFactor);

  const coreContribution = wCore * coreScore;
  const jurisprudenceContribution = wJuris * sJuris;

  const baseScore = (coreContribution + jurisprudenceContribution) * 100;

  /* ==================== Penalidades ==================== */

  const penaltyWeak = penaltyFromWeaknesses(weaknesses);
  const penaltyStyle = penaltyFromStyle(styleFindings);
  const penaltyContrad = penaltyFromContradictions(contradictions);

  const penaltySemantic = penaltyFromSemanticCoherence(semanticCoherence);
  const rhetoricPenalty =
    rhetoricAnalysis?.summary?.score < 60 ? 5 :
    rhetoricAnalysis?.summary?.score < 45 ? 10 : 0;

  const totalPenalties =
    penaltyWeak +
    penaltyStyle +
    penaltyContrad +
    penaltySemantic;
    rhetoricPenalty;

  /* ==================== Bonus ==================== */

  const bonus = excellenceBonus({
    baseScore,
    weaknesses,
    contradictions,
    bestJurisScore,
    sMotiv,
    sNorma,
  });

  /* ==================== Score final ==================== */

  let score = baseScore - totalPenalties + bonus;
  score = clamp(score, 0, 100);

  /* ==================== Breakdown ==================== */

  const breakdown = {
    docType: finalDocType,
    docTypeInferred: shouldInfer ? true : false,
    docTypeConfidence: shouldInfer ? inferred.confidence : 1,

    estructuraCore: Math.round(coreContribution * 100),
    jurisprudenciaImpacto: Math.round(jurisprudenceContribution * 100),
    riesgoProcesal: Math.round(proceduralRiskFactor * 10),

    pretension: Math.round(sPretension * 20),
    norma: Math.round(sNorma * 20),
    motivacion: Math.round(sMotiv * 25),
    evidencia: Math.round(sEvid * 10),

    coreWeights: weights,

    contradicciones: contradictions?.summary ?? null,
    bonificacionExcelencia: bonus,
    coherenciaSemantica: semanticCoherence?.summary ?? null,
    retorica: rhetoricAnalysis?.summary ?? null,
  };

  return {
    score: Math.round(score),
    bucket: bucket(score),

    breakdown,

    penalties: {
      weaknesses: penaltyWeak,
      style: penaltyStyle,
      contradictions: penaltyContrad,
      semanticCoherence: penaltySemantic,
      total: totalPenalties,
    },

    bonus,

    weights: {
      core: wCore,
      jurisprudencia: wJuris,
    },

    meta: {
      docType: finalDocType,
      docTypeDetected: shouldInfer ? inferred : null,
      useEmbeddingsForContradictions: !!useEmbeddingsForContradictions,
      bestJurisScore,
      engineVersion: "2.3-doctype-auto",
    },
  };
}