// ============================================================================
// 🧠 LITIS ANALYSIS KERNEL – ENTRY POINT (C1 · R2 ENTERPRISE)
// ----------------------------------------------------------------------------
// Punto único de acceso al análisis estructural del razonamiento.
// Integra sin interpretaciones:
//   - Coherencia estructural (B1) → scoreCoherence
//   - Detección de falacias (B2) → detectFallacies
//   - Métricas objetivas del discurso (B3) → computeArgumentMetrics
//   - Evaluación integral (C1 completo) → evaluateArgumentQuality
//
// NO genera texto.
// NO interactúa con el usuario.
// NO aplica estilo.
// Output 100% estructural para C3–C6.
// ============================================================================

import { scoreCoherence } from "./coherenceScorer.js";
import { detectFallacies } from "./fallacyDetector.js";
import { computeArgumentMetrics } from "./metrics.js";
import { evaluateArgumentQuality } from "./argumentQuality.js";

// Export ordenado (API estable)
export {
  // Nivel 1 — análisis atómico
  scoreCoherence,
  detectFallacies,
  computeArgumentMetrics,

  // Nivel 2 — análisis compuesto (C1 completo)
  evaluateArgumentQuality,
};
