// ============================================================================
// 🦉 CASES AUDIT ROUTES — Timeline jurídico auditado (PRODUCCIÓN)
// ----------------------------------------------------------------------------
// - Acceso SOLO por usuario autenticado
// - NO stubs
// - NO lógica de prueba
// - Lectura + verificación de integridad
// ============================================================================

import express from "express";
import CaseSession from "../models/CaseSession.js";
import { buildAuditTimeline } from "../services/audit/auditTimelineService.js";
import { verifyAuditChain } from "../services/audit/auditVerifyService.js";
import { buildStrategicSummary } from "../services/audit/auditStrategicService.js";
import { buildStrategicAlerts } from "../services/audit/auditAlertsService.js";
import { buildCaseTensions } from "../services/audit/auditTensionsService.js";
import { buildCaseResilience } from "../services/audit/auditResilienceService.js";
import { buildStrategicManeuvers } from "../services/audit/auditManeuversService.js";
import { buildNoReturnPoints } from "../services/audit/auditNoReturnService.js";
import { buildRedLines } from "../services/audit/auditRedLinesService.js";
import { buildDecisionPreparation } from "../services/audit/auditDecisionPrepService.js";


const router = express.Router();

/**
 * 🔐 Middleware interno: verifica autenticación y propiedad del caso
 */
async function authorizeCase(req, res) {
  const userId = req.user?._id;
  const { caseId } = req.params;

  if (!userId) {
    return { error: "No autorizado", status: 401 };
  }

  const caseSession = await CaseSession.findOne({
    _id: caseId,
    userId,
  }).lean();

  if (!caseSession) {
    return { error: "Caso no encontrado", status: 404 };
  }

  return { caseSession };
}

/**
 * 🔹 GET /api/cases/:caseId/audit
 * Devuelve la línea de tiempo jurídica auditada del caso
 */
router.get("/:caseId/audit", async (req, res) => {
  try {
    const auth = await authorizeCase(req, res);
    if (auth.error) {
      return res.status(auth.status).json({ error: auth.error });
    }

    const { caseId } = req.params;

    const timeline = await buildAuditTimeline(caseId);

    return res.json({
      caseId,
      title: auth.caseSession.title || "Caso sin título",
      timeline,
    });
  } catch (err) {
    console.error("GET /cases/:caseId/audit error:", err);
    return res.status(500).json({
      error: "Error al construir auditoría del caso",
    });
  }
});

/**
 * 🔹 GET /api/cases/:caseId/audit/decision-prep
 * Devuelve síntesis final para decisión humana (UX-8.0)
 */
router.get("/:caseId/audit/decision-prep", async (req, res) => {
  try {
    const auth = await authorizeCase(req, res);
    if (auth.error) {
      return res.status(auth.status).json({ error: auth.error });
    }

    const { caseId } = req.params;

    const timeline = await buildAuditTimeline(caseId);
    const verification = await verifyAuditChain(caseId);
    const strategy = buildStrategicSummary(timeline);
    const checklist = null; // UX-7.0 ya es visual
    const tensions = buildCaseTensions(timeline);
    const resilience = buildCaseResilience(timeline);
    const maneuvers = buildStrategicManeuvers(timeline);
    const noReturn = buildNoReturnPoints({
      timeline,
      tensions: tensions.tensions,
      verification,
    });
    const redLines = buildRedLines({
      verification,
      noReturn,
      tensions: tensions.tensions,
    });

    const decisionPrep = buildDecisionPreparation({
      strategy,
      checklist,
      tensions,
      resilience,
      maneuvers,
      noReturn,
      redLines,
    });

    return res.json({
      caseId,
      decisionPrep,
    });
  } catch (err) {
    console.error("audit decision-prep error:", err);
    return res.status(500).json({
      error: "Error al preparar decisión humana",
    });
  }
});

/**
 * 🔹 GET /api/cases/:caseId/audit/verify
 * Verifica la integridad de la cadena de auditoría del caso
 */
router.get("/:caseId/audit/verify", async (req, res) => {
  try {
    const auth = await authorizeCase(req, res);
    if (auth.error) {
      return res.status(auth.status).json({ error: auth.error });
    }

    const { caseId } = req.params;

    const verification = await verifyAuditChain(caseId);

    return res.json({
      caseId,
      verifiedAt: new Date().toISOString(),
      verification,
    });
  } catch (err) {
    console.error("GET /cases/:caseId/audit/verify error:", err);
    return res.status(500).json({
      error: "Error al verificar integridad de auditoría",
    });
  }
});
/**
 * 🔹 GET /api/cases/:caseId/audit/strategy
 * Devuelve lectura estratégica del caso (UX-6.8)
 */
router.get("/:caseId/audit/strategy", async (req, res) => {
  try {
    const auth = await authorizeCase(req, res);
    if (auth.error) {
      return res.status(auth.status).json({ error: auth.error });
    }

    const { caseId } = req.params;

    const timeline = await buildAuditTimeline(caseId);
    const strategy = buildStrategicSummary(timeline);

    return res.json({
      caseId,
      strategy,
    });
  } catch (err) {
    console.error("audit strategy error:", err);
    return res.status(500).json({
      error: "Error al construir lectura estratégica",
    });
  }
});

/**
 * 🔹 GET /api/cases/:caseId/audit/tensions
 * Devuelve tensiones jurídicas del caso (UX-7.2)
 */
router.get("/:caseId/audit/tensions", async (req, res) => {
  try {
    const auth = await authorizeCase(req, res);
    if (auth.error) {
      return res.status(auth.status).json({ error: auth.error });
    }

    const { caseId } = req.params;

    const timeline = await buildAuditTimeline(caseId);
    const tensions = buildCaseTensions(timeline);

    return res.json({
      caseId,
      tensions,
    });
  } catch (err) {
    console.error("audit tensions error:", err);
    return res.status(500).json({
      error: "Error al analizar tensiones del caso",
    });
  }
});

/**
 * 🔹 GET /api/cases/:caseId/audit/resilience
 * Devuelve puntos de resiliencia del caso (UX-7.3)
 */
router.get("/:caseId/audit/resilience", async (req, res) => {
  try {
    const auth = await authorizeCase(req, res);
    if (auth.error) {
      return res.status(auth.status).json({ error: auth.error });
    }

    const { caseId } = req.params;

    const timeline = await buildAuditTimeline(caseId);
    const resilience = buildCaseResilience(timeline);

    return res.json({
      caseId,
      resilience,
    });
  } catch (err) {
    console.error("audit resilience error:", err);
    return res.status(500).json({
      error: "Error al evaluar resiliencia del caso",
    });
  }
});

/**
 * 🔹 GET /api/cases/:caseId/audit/maneuvers
 * Devuelve zonas de maniobra estratégica del caso (UX-7.4)
 */
router.get("/:caseId/audit/maneuvers", async (req, res) => {
  try {
    const auth = await authorizeCase(req, res);
    if (auth.error) {
      return res.status(auth.status).json({ error: auth.error });
    }

    const { caseId } = req.params;

    const timeline = await buildAuditTimeline(caseId);
    const maneuvers = buildStrategicManeuvers(timeline);

    return res.json({
      caseId,
      maneuvers,
    });
  } catch (err) {
    console.error("audit maneuvers error:", err);
    return res.status(500).json({
      error: "Error al detectar zonas de maniobra",
    });
  }
});

/**
 * 🔹 GET /api/cases/:caseId/audit/no-return
 * Devuelve puntos de no retorno del caso (UX-7.5)
 */
router.get("/:caseId/audit/no-return", async (req, res) => {
  try {
    const auth = await authorizeCase(req, res);
    if (auth.error) {
      return res.status(auth.status).json({ error: auth.error });
    }

    const { caseId } = req.params;

    const timeline = await buildAuditTimeline(caseId);
    const verification = await verifyAuditChain(caseId);

    // Reusar tensiones ya calculadas
    const { tensions } = buildCaseTensions(timeline);

    const noReturn = buildNoReturnPoints({
      timeline,
      tensions,
      verification,
    });

    return res.json({
      caseId,
      noReturn,
    });
  } catch (err) {
    console.error("audit no-return error:", err);
    return res.status(500).json({
      error: "Error al evaluar puntos de no retorno",
    });
  }
});

/**
 * 🔹 GET /api/cases/:caseId/audit/red-lines
 * Devuelve líneas rojas del caso (UX-7.6)
 */
router.get("/:caseId/audit/red-lines", async (req, res) => {
  try {
    const auth = await authorizeCase(req, res);
    if (auth.error) {
      return res.status(auth.status).json({ error: auth.error });
    }

    const { caseId } = req.params;

    const timeline = await buildAuditTimeline(caseId);
    const verification = await verifyAuditChain(caseId);
    const { tensions } = buildCaseTensions(timeline);
    const noReturn = buildNoReturnPoints({
      timeline,
      tensions,
      verification,
    });

    const redLines = buildRedLines({
      verification,
      noReturn,
      tensions,
    });

    return res.json({
      caseId,
      redLines,
    });
  } catch (err) {
    console.error("audit red-lines error:", err);
    return res.status(500).json({
      error: "Error al evaluar líneas rojas del caso",
    });
  }
});

/**
 * 🔹 GET /api/cases/:caseId/audit/alerts
 * Devuelve alertas estratégicas accionables (NO ejecuta actos)
 */
router.get("/:caseId/audit/alerts", async (req, res) => {
  try {
    const auth = await authorizeCase(req, res);
    if (auth.error) {
      return res.status(auth.status).json({ error: auth.error });
    }

    const { caseId } = req.params;

    const timeline = await buildAuditTimeline(caseId);
    const verification = await verifyAuditChain(caseId);
    const alerts = buildStrategicAlerts(timeline, verification);

    return res.json({
      caseId,
      generatedAt: new Date().toISOString(),
      alerts,
    });
  } catch (err) {
    console.error("audit alerts error:", err);
    return res.status(500).json({
      error: "Error al generar alertas estratégicas",
    });
  }
});

/**
 * 🔹 GET /api/cases/:caseId/audit/checklist
 * Devuelve checklist de preparación estratégica (UX-7.0)
 */
router.get("/:caseId/audit/checklist", async (req, res) => {
  try {
    const auth = await authorizeCase(req, res);
    if (auth.error) {
      return res.status(auth.status).json({ error: auth.error });
    }

    const { caseId } = req.params;

    const timeline = await buildAuditTimeline(caseId);
    const verification = await verifyAuditChain(caseId);
    const alerts = buildStrategicAlerts(timeline, verification);

    const checklist = buildStrategicChecklist({
      timeline,
      verification,
      alerts,
    });

    return res.json({
      caseId,
      generatedAt: new Date().toISOString(),
      checklist,
    });
  } catch (err) {
    console.error("audit checklist error:", err);
    return res.status(500).json({
      error: "Error al construir checklist estratégico",
    });
  }
});

/**
 * 🔹 GET /api/cases/:caseId/audit/scenarios
 * Simulación comparativa de escenarios jurídicos (UX-7.1)
 */
router.get("/:caseId/audit/scenarios", async (req, res) => {
  try {
    const auth = await authorizeCase(req, res);
    if (auth.error) {
      return res.status(auth.status).json({ error: auth.error });
    }

    const { caseId } = req.params;

    const timeline = await buildAuditTimeline(caseId);
    const verification = await verifyAuditChain(caseId);
    const alerts = buildStrategicAlerts(timeline, verification);
    const checklist = buildStrategicChecklist({
      timeline,
      verification,
      alerts,
    });

    const scenarios = buildScenarioSimulation({
      timeline,
      alerts,
      checklist,
    });

    return res.json({
      caseId,
      ...scenarios,
    });
  } catch (err) {
    console.error("audit scenarios error:", err);
    return res.status(500).json({
      error: "Error al construir simulación de escenarios",
    });
  }
});

export default router;
