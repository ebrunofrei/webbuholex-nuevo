// ============================================================================
// 🧠 D3 PIPELINE — INTEGRADOR DE RAZONAMIENTO JURÍDICO (R2 ENTERPRISE)
// ----------------------------------------------------------------------------
// Orquesta todos los módulos D3* en una única cadena determinista:
//
//   1) normalizeReasoning         (D3.1)
//   2) runCoherenceChecks         (D3.5)
//   3) applyEpistemicHumility     (D3.6)
//   4) scaleGravity               (D3.3)
//   5) buildConditionalConclusion (D3.4)
//   6) applyGoldenClosure         (D3.7)
//
// NO:
//   ❌ Genera texto visible al usuario
//   ❌ Impone estilo
//   ❌ Toca C1–C6 directamente
//
// Devuelve un objeto interno perfecto para C2–C5.
// ============================================================================

// ------------------- IMPORTS (existentes en tu estructura) -------------------
import normalizeReasoning from "./reasoningNormalizer.js";
import runCoherenceChecks from "./coherenceChecks.js";
import applyEpistemicHumility from "./epistemicHumility.js";
import scaleGravity from "./gravityScaler.js";
import buildConditionalConclusion from "./conditionalConclusion.js";
import applyGoldenClosure from "./goldenClosure.js";

// ============================================================================
// 🧩 PIPELINE PRINCIPAL — deterministic & idempotent
// ============================================================================
export function runReasoningPipeline({
  input = "",
  context = {},
}) {
  // ---------------------------------------------------------
  // 1️⃣ Normalización del razonamiento (D3.1)
  // ---------------------------------------------------------
  const base = normalizeReasoning(input, context);
  // base = { issue, facts, rule, reasoning, conclusion }

  // ---------------------------------------------------------
  // 2️⃣ Coherence checks (D3.5) — rebaja si hay inconsistencias
  // ---------------------------------------------------------
  const coherence = runCoherenceChecks({
    reasoning: base.reasoning,
    conclusion: base.conclusion,
    facts: base.facts,
    context,
    gravity: {}, // se define luego; aquí no influye
  });

  // reasoning y conclusion posiblemente atenuados
  let reasoning = coherence.reasoning;
  let conclusion = coherence.conclusion;

  // ---------------------------------------------------------
  // 3️⃣ Humildad epistémica (D3.6)
  // ---------------------------------------------------------
  const humbled = applyEpistemicHumility({
    reasoning,
    conclusion,
    context,
    flags: coherence.flags,
  });

  reasoning = humbled.reasoning;
  conclusion = humbled.conclusion;

  // ---------------------------------------------------------
  // 4️⃣ Escalado de gravedad jurídica (D3.3)
  // ---------------------------------------------------------
  const gravity = scaleGravity({
    issue: base.issue,
    facts: base.facts,
    detected: [], // Falacias no se manejan en D3, solo C1
    context,
  });

  // ---------------------------------------------------------
  // 5️⃣ Conclusión condicionada según gravedad (D3.4)
  // ---------------------------------------------------------
  const conditional = buildConditionalConclusion({
    issue: base.issue,
    gravity,
    context,
  });

  // ---------------------------------------------------------
  // 6️⃣ Golden Closure — cierre único y útil (D3.7)
  // ---------------------------------------------------------
  const finalConclusion = applyGoldenClosure({
    conclusion: conditional,
    gravity,
    context,
  });

  // ========================================================================
  // 📦 RETORNO FINAL — listo para auditorías C3, agravios C4 y nulidades C5
  // ========================================================================
  return {
    issue: base.issue,
    facts: base.facts,
    rule: base.rule,

    reasoning,
    conclusion: finalConclusion,

    coherenceFlags: coherence.flags,
    tonedDown: coherence.tonedDown,

    gravity, // { level, label }

    meta: {
      stage: "D3_PIPELINE",
      valid: true,
    },
  };
}

export default runReasoningPipeline;
