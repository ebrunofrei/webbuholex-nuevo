import { detectArgumentWeaknesses } from "./signals/ArgumentWeaknessDetector.js";
import { detectCourtStyleFindings } from "./signals/CourtStyleCritic.js";
import { runContradictionEngine } from "./signals/ContradictionEngine.js";
import { runSemanticCoherenceEngine } from "./signals/SemanticCoherenceEngine.js";
import { runRhetoricEngine } from "./signals/RhetoricEngine.js";
import { predictDecisionOutcome } from "./predictive/DecisionOutcomePredictor.js";

import { computeDecisionScore } from "./scoring/DecisionScoreEngine.js";
import { getJurisprudenceAlignment } from "./jurisprudence/JurisprudenceAlignment.js";

/**
 * 🏛️ Simulador de Magistrado — Núcleo Cognitivo
 * Orquesta todos los motores:
 * - Debilidades argumentativas
 * - Estilo judicial
 * - Contradicciones semánticas
 * - Jurisprudencia vectorial real
 * - Score estructural final
 */
export async function runJudicialDecisionSimulation({
  usuarioId,
  caseId = null,
  text,
  docType = "desconocido",
  jurisdiction = "PE",

  // ⚙️ flags cognitivos
  useEmbeddingsForContradictions = true,

  // 🎯 umbrales
  minJurisScore = 0.83,
} = {}) {

  const source = String(text || "").trim();

  if (!source) {
    return buildEmptyResponse({ docType, jurisdiction });
  }

  // =========================================================
  // 1️⃣ PARSEO BÁSICO DE SECCIONES (base para engines avanzados)
  // =========================================================
  const sections = parseSections(source);

  // =========================================================
  // 2️⃣ MOTORES COGNITIVOS
  // =========================================================

  // A) Debilidades estructurales
  const weaknesses = detectArgumentWeaknesses(source, {
    docType,
    jurisdiction,
  });

  // B) Estilo Corte
  const styleFindings = detectCourtStyleFindings(source);

  // C) Contradicciones internas (nuevo motor)
  const contradictionReport = runContradictionEngine({
    text: source,
    sections,
    meta: { usuarioId, caseId, docType, jurisdiction },
  });

  const semanticCoherence = runSemanticCoherenceEngine({
    text: source,
    sections,
    meta: { usuarioId, caseId, docType, jurisdiction },
  });

  const rhetoricAnalysis = runRhetoricEngine({
    text: source,
  });

  // D) Jurisprudencia real (vectorial)
  const jurisprudenceAlignment = await getJurisprudenceAlignment({
    usuarioId,
    caseId,
    queryText: source,
    jurisdiction,
    topK: 5,
    minScore: minJurisScore,
  });

  // =========================================================
  // 3️⃣ SCORE ESTRUCTURAL CENTRAL
  // =========================================================

  const scorePacket = computeDecisionScore({
    text: source,
    docType,
    weaknesses,
    styleFindings,
    contradictions: contradictionReport,
    semanticCoherence,
    rhetoricAnalysis,
    jurisprudenceAlignment,
    useEmbeddingsForContradictions,
  });

  // =========================================================
// 4️⃣ PREDICTOR DECISIONAL
// =========================================================

const predictiveOutcome = predictDecisionOutcome({
  score: scorePacket.score,
  penalties: scorePacket.penalties,
  jurisprudenceAlignment,
  contradictions: contradictionReport,
  semanticCoherence,
  rhetoricAnalysis,
  docType,
});

  // =========================================================
  // 4️⃣ DICTAMEN SIMULADO (fundamentación narrativa)
  // =========================================================

  const judicialNarrative = buildJudicialNarrative({
    weaknesses,
    styleFindings,
    contradictionReport,
    semanticCoherence,
    rhetoricAnalysis,
    jurisprudenceAlignment,
    predictiveOutcome,
    score: scorePacket.score,
});

  // =========================================================
  // 5️⃣ RESPUESTA INSTITUCIONAL FINAL
  // =========================================================

  return {
    ...scorePacket,
    weaknesses,
    styleFindings,
    contradictions: contradictionReport,
    semanticCoherence,
    rhetoricAnalysis,
    jurisprudenceAlignment,
    predictiveOutcome,
    judicialNarrative,
    meta: {
      docType,
      jurisdiction,
      useEmbeddingsForContradictions: !!useEmbeddingsForContradictions,
      version: "3.0-cognitive-predictive",
    },
  };
}

/* ========================================================= */
/* ==================== HELPERS INTERNOS =================== */
/* ========================================================= */

function buildEmptyResponse({ docType, jurisdiction }) {
  return {
    score: 0,
    bucket: "baja",
    breakdown: {},
    weaknesses: [
      { code: "EMPTY_TEXT", label: "Texto vacío", severity: "alta" },
    ],
    styleFindings: [],
    contradictions: null,
    jurisprudenceAlignment: null,
    judicialNarrative: "No es posible realizar simulación decisional sobre texto vacío.",
    meta: { docType, jurisdiction },
  };
}

/**
 * Parser simple (v1)
 * En el futuro puede convertirse en SectionClassifier.js
 */
function parseSections(text) {
  return [
    {
      id: "full_document",
      start: 0,
      end: text.length,
    },
  ];
}

/**
 * Construye fundamentación simulada estilo tribunal
 */
function buildJudicialNarrative({
  weaknesses,
  styleFindings,
  contradictionReport,
  semanticCoherence,
  rhetoricAnalysis,
  jurisprudenceAlignment,
  predictiveOutcome,
  score,
}) {
  const blocks = [];

  if (contradictionReport?.summary?.critical > 0) {
    blocks.push(
      "Se identifican contradicciones críticas que comprometen la consistencia interna del planteamiento."
    );
  }

  if (semanticCoherence?.summary?.high > 0) {
    blocks.push(
      "Se advierten saltos inferenciales relevantes que afectan la continuidad lógica del razonamiento."
    );
  }

  if (weaknesses?.length > 0) {
    blocks.push(
      "Existen debilidades estructurales que inciden en la suficiencia de la motivación."
    );
  }

  if (jurisprudenceAlignment?.bestScore < 0.8) {
    blocks.push(
      "La alineación jurisprudencial no aparece sólidamente consolidada."
    );
  }

  if (rhetoricAnalysis?.summary?.score < 60) {
    blocks.push(
      "El ritmo argumentativo podría optimizarse para mejorar la persuasividad."
    );
  }

  if (predictiveOutcome?.probabilidadExito >= 0.75) {
    blocks.push(
      "Desde una perspectiva predictiva, el planteamiento presenta viabilidad razonable ante un estándar judicial ordinario."
    );
  } else if (predictiveOutcome?.probabilidadExito < 0.5) {
    blocks.push(
      "El escenario predictivo refleja riesgo elevado de desestimación si no se fortalecen los ejes argumentativos."
    );
  }

  if (score >= 85) {
    blocks.push(
      "En conjunto, el escrito alcanza un estándar estructural robusto."
    );
  }

  return blocks.join(" ");
}