// ============================================================================
// 🧠 PROCEDURAL INDEX – LITISBOT (FASE C3)
// ----------------------------------------------------------------------------
// Punto único de exportación del razonamiento procedimental.
// NO contiene lógica de orquestación.
// NO accede a infraestructura.
// ============================================================================

// Auditoría de motivación (motivación aparente / suficiente)
export { auditMotivation } from "./motivationAudit.js";

// Construcción de agravios lógico-jurídicos
export { buildGrievances } from "./grievanceBuilder.js";

// Checklist de nulidades procesales
export { buildNullityChecklist } from "./nullityChecklist.js";

// Decisor único de activación del análisis procedimental
export { shouldRunAnalysis } from "./shouldRunAnalysis.js";

// backend/brain/procedural/index.js
export { classifyVices } from "../../vicioClassifier.js";

// 🧭 FASE C5
export { buildProceduralRecommendation } from "./recommendationEngine.js";
export { adviseTiming } from "./timingAdvisor.js";


