// ======================================================================
// ⚖️ LITISBOT — PROCEDURAL KERNEL (C3–C5 · ENTERPRISE)
// ----------------------------------------------------------------------
// Punto único de acceso a los módulos procesales internos:
//
//   • C3 → Auditoría motivacional
//   • C3 → Agravios
//   • C3 → Checklist de nulidad
//   • C4 → Clasificación del vicio
//   • C5 → Recomendación procesal
//   • Asesoría temporal (plazos procesales)
//   • shouldRunAnalysis → gatillo de activación C1–C5
//
// Ninguno de estos módulos genera texto visible para el usuario.
// ======================================================================

// ---------------------------
// C3 — Auditoría motivacional
// ---------------------------
import { auditMotivation } from "./motivationAudit.js";

// ---------------------------
// C3 — Agravios
// ---------------------------
import { buildGrievances } from "./grievanceBuilder.js";

// ---------------------------
// C3 — Checklist de nulidad
// ---------------------------
import { buildNullityChecklist } from "./nullityChecklist.js";

// ---------------------------
// C4 — Clasificación del vicio
// ---------------------------
import { classifyVicio } from "./vicioClassifier.js";

// ---------------------------
// C5 — Recomendación procesal
// ---------------------------
import { buildProceduralRecommendation } from "./recommendationEngine.js";

// ---------------------------
// Asesor de plazos (C5 complementario)
// ---------------------------
import { adviseTiming } from "./timingAdvisor.js";

// ---------------------------
// Gatillo que decide si ejecutar C1–C5
// ---------------------------
import { shouldRunAnalysis } from "./shouldRunAnalysis.js";

// ======================================================================
// EXPORTACIONES — API PÚBLICA DEL KERNEL PROCESAL
// ======================================================================
export {
  auditMotivation,
  buildGrievances,
  buildNullityChecklist,
  classifyVicio,
  buildProceduralRecommendation,
  adviseTiming,
  shouldRunAnalysis,
};

// ======================================================================
// DEFAULT EXPORT (útil para importación amplia en motores superiores)
// ======================================================================
export default {
  auditMotivation,
  buildGrievances,
  buildNullityChecklist,
  classifyVicio,
  buildProceduralRecommendation,
  adviseTiming,
  shouldRunAnalysis,
};
