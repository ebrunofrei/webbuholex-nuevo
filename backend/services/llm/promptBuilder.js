// ======================================================================
// 🧠 PROMPT BUILDER – CONTEXTO + EVIDENCIA (ENTERPRISE C1 → C6)
// ======================================================================

import { extraerTextoDeAdjuntosPdf } from "../pdfTextService.js";
import buildSystemPrompt from "../../brain/buildSystemPrompt.js";

// C1
import { evaluateArgumentQuality } from "../../brain/analysis/index.js";

// C2
import { buildArgumentReport } from "../../brain/reporting/argumentReport.js";

// C3
import {
  auditMotivation,
  buildGrievances,
  buildNullityChecklist,
} from "../../brain/procedural/index.js";

// C4
import { classifyVices } from "../../vicioClassifier.js";

// C5
import { buildProceduralRecommendation } from "../../brain/procedural/recommendationEngine.js";

/* ====================================================================== */

const DEFAULT_COGNITIVE_PROFILE = {
  rigor: true,
  brevedad: false,
  profundidad: "alta",
  citasJuridicas: true,
  logicaFormal: true,
  logicaJuridica: true,
  logicaMatematica: true,
  controlDeFalacias: true,
  metodo: {
    hipotesis: true,
    contrastacion: true,
    contraejemplos: true,
    cargaDeLaPrueba: true,
  },
};

function normalizeCognitive(cognitive = {}) {
  return {
    version: cognitive?.version || 1,
    mode: cognitive?.mode || "litigante",
    role: cognitive?.role || "abogado",
    profile: {
      ...DEFAULT_COGNITIVE_PROFILE,
      ...(cognitive?.profile || {}),
    },
  };
}

function safeStr(v, maxLen = 8000) {
  if (v == null) return "";
  const s = String(v).replace(/\n{3,}/g, "\n\n").trim();
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

/* ====================================================================== */

export async function buildLLMContext({
  prompt,
  adjuntosNorm = [],
  body = {},
  expedienteId,
  pais,
  idioma,
  materia,
  cognitive,
}) {
  const promptSafe = safeStr(prompt, 10_000);
  const isContinuation =
  promptSafe.length < 120 &&
  /sí|ok|continúa|amplía|sigue|exacto|así es|correcto/i.test(promptSafe);

  const safeCognitive = normalizeCognitive(cognitive);

  /* ================= C1 — ANÁLISIS SILENCIOSO ================= */
  let analysis = null;
  let argumentGuidance = "";

  try {
    analysis = evaluateArgumentQuality({
      prompt: promptSafe,
      draft: "",
      cognitiveProfile: safeCognitive.profile,
    });

    if (analysis?.flags?.highLogicalRisk) {
      argumentGuidance =
        "Aplicar razonamiento estrictamente deductivo y justificar cada inferencia.";
    } else if (analysis?.flags?.hasFallacies) {
      argumentGuidance =
        "Evitar falacias lógicas y reforzar la conexión entre premisas y conclusiones.";
    }
  } catch {}

  /* ================= C2 — REPORTE ================= */
  const wantsAnalysis =
    // explícito
    /análisis lógico|falacias|coherencia|modo pericial|control lógico|argumentativo/i.test(promptSafe)
    ||
    // implícito: el usuario está razonando
    promptSafe.length > 120 &&
    /porque|por tanto|en consecuencia|sin embargo|no obstante|toda vez que|dado que|se desprende|vulneración|infracción|derecho/i.test(promptSafe);

  const analysisReport =
    wantsAnalysis && analysis ? buildArgumentReport(analysis) : null;

  /* ================= C3–C5 — BLOQUE PROCESAL ================= */
  let procedural = null;

  if ((wantsAnalysis || isContinuation) && analysis) {
    try {
      const audit = auditMotivation({ analysis, decisionText: promptSafe });
      const agravios = buildGrievances({ analysis, audit });
      const checklist = buildNullityChecklist({ audit, agravios });
      const vicio = classifyVices({ audit, agravios, checklist });

      const recommendation = buildProceduralRecommendation({
        vicio,
        agravios,
        checklist,
        contexto: {
          materia,
          pais,
          instancia: body?.instancia || null,
        },
      });

      procedural = {
        audit,
        agravios,
        checklist,
        vicio,
        recommendation,
      };
    } catch {
      procedural = null;
    }
  }

  /* ================= 📚 EVIDENCIA PDF ================= */
  let pdfContext = "";
  try {
    const extracted = await extraerTextoDeAdjuntosPdf(adjuntosNorm);
    pdfContext = safeStr(extracted, 8000);
  } catch {}

  /* ================= 🧠 SYSTEM PROMPT ================= */
  const systemPromptFinal = buildSystemPrompt({
    texto: promptSafe,
    cognitive: safeCognitive,
    argumentGuidance,
    analysisReport,
    proceduralContext: procedural,
    evidenciaPdf: pdfContext || null,
    estilo: "markdown_profesional",
    extraContext: `
idioma=${idioma || "es"}
pais=${pais || "PE"}
materia=${materia || "indefinida"}
expedienteId=${expedienteId || ""}
`.trim(),
  });

  const canExportWord = Boolean(analysisReport || procedural);

  return {
    systemPromptFinal,
    temperature: procedural || isContinuation ? 0.25 : 0.65,
    analysisReport,
    procedural,
    actionsMeta: {
      exportWord: canExportWord,
    },
  };
}
