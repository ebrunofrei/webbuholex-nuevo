// ======================================================================
// 🧠 LITIS ANALYSIS KERNEL – ENTRY POINT (FASE B4)
// ----------------------------------------------------------------------
// Punto único de acceso al análisis cognitivo-argumentativo.
// Integra:
// - Coherencia lógica
// - Detección de falacias
// - Evaluación global de calidad argumental
//
// ❌ No genera texto
// ❌ No impone estilo
// ❌ No interactúa con el usuario
// ======================================================================

import { scoreCoherence } from "./coherenceScorer.js";
import { detectFallacies } from "./fallacyDetector.js";
import { evaluateArgumentQuality } from "./argumentQuality.js";

export {
  // Nivel 1 (bajo nivel)
  scoreCoherence,
  detectFallacies,

  // Nivel 2 (agregado)
  evaluateArgumentQuality,
};
