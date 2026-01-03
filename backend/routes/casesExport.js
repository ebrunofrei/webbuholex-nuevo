// ============================================================================
// 🦉 CASES EXPORT ROUTES — Briefing & Export (FASE 9)
// ----------------------------------------------------------------------------
// - Acceso SOLO por usuario autenticado
// - NO ejecución de actos
// - SOLO lectura + exportación bajo decisión humana
// ============================================================================

import express from "express";
import CaseSession from "../models/CaseSession.js";

// Auditoría
import { buildAuditTimeline } from "../services/audit/auditTimelineService.js";
import { verifyAuditChain } from "../services/audit/auditVerifyService.js";

// Lectura estratégica
import { buildStrategicSummary } from "../services/audit/auditStrategicService.js";
import { buildCaseTensions } from "../services/audit/auditTensionsService.js";
import { buildCaseResilience } from "../services/audit/auditResilienceService.js";
import { buildStrategicManeuvers } from "../services/audit/auditManeuversService.js";
import { buildNoReturnPoints } from "../services/audit/auditNoReturnService.js";
import { buildRedLines } from "../services/audit/auditRedLinesService.js";
import { buildDecisionPreparation } from "../services/audit/auditDecisionPrepService.js";

// Briefing & export
import { buildJudicialBriefing } from "../services/briefing/briefingBuilder.js";
import { generateJudicialWord } from "../services/export/wordExportService.js";
import { generateJudicialPdf } from "../services/export/pdfExportService.js";
import { generateUniversalPdf } from "../services/export/pdf/pdfBuilder.js";


const router = express.Router();

/**
 * 🔐 Autorización común
 */
async function authorizeCase(req) {
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
 * 🔹 GET /api/cases/:caseId/briefing
 * Lectura jurídica estructurada (FASE 9 – sin exportar)
 */
router.get("/:caseId/briefing", async (req, res) => {
  try {
    const auth = await authorizeCase(req);
    if (auth.error) {
      return res.status(auth.status).json({ error: auth.error });
    }

    const { caseId } = req.params;

    const timeline = await buildAuditTimeline(caseId);
    const verification = await verifyAuditChain(caseId);

    const strategy = buildStrategicSummary(timeline);
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
      tensions,
      resilience,
      maneuvers,
      noReturn,
      redLines,
    });

    const briefing = buildJudicialBriefing({
      caseSession: auth.caseSession,
      timeline,
      strategy,
      tensions,
      resilience,
      maneuvers,
      noReturn,
      redLines,
      decisionPrep,
    });

    return res.json({
      caseId,
      briefing,
    });
  } catch (err) {
    console.error("BRIEFING error:", err);
    return res.status(500).json({
      error: "Error al generar briefing jurídico",
    });
  }
});

/**
 * 🔹 GET /api/cases/:caseId/export/:format
 * Exportación consciente (Word / PDF)
 */
router.get("/:caseId/export/:format", async (req, res) => {
  try {
    const auth = await authorizeCase(req);
    if (auth.error) {
      return res.status(auth.status).json({ error: auth.error });
    }

    const { caseId, format } = req.params;

    const timeline = await buildAuditTimeline(caseId);

    if (format === "word") {
      const buffer = await generateJudicialWord({
        caseSession: auth.caseSession,
        timeline,
      });

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="briefing-${caseId}.docx"`
      );
      res.type(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
      return res.send(buffer);
    }

    if (format === "pdf") {
      const buffer = await generateJudicialPdf({
        caseSession: auth.caseSession,
        timeline,
      });

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="briefing-${caseId}.pdf"`
      );
      res.type("application/pdf");
      return res.send(buffer);
    }

    return res.status(400).json({ error: "Formato no soportado" });
  } catch (err) {
    console.error("EXPORT error:", err);
    return res.status(500).json({
      error: "Error al exportar briefing",
    });
  }
});

/**
 * 🔹 GET /api/cases/:caseId/export/word
 * Exporta briefing jurídico en formato Word (.docx)
 */
router.get("/:caseId/export/word", async (req, res) => {
  try {
    const userId = req.user?._id;
    const { caseId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "No autorizado" });
    }

    // 1️⃣ Reutilizar briefing (FASE 9)
    const briefingResponse = await fetch(
      `${process.env.INTERNAL_API_URL}/api/cases/${caseId}/briefing`,
      {
        headers: {
          Authorization: req.headers.authorization || "",
        },
      }
    );

    const briefingData = await briefingResponse.json();
    const briefing = briefingData.briefing;

    // 2️⃣ Generar Word
    const { filePath, filename } = await generateJudicialWord({ briefing });

    // 3️⃣ Enviar archivo
    res.download(filePath, filename);
  } catch (err) {
    console.error("Export Word error:", err);
    res.status(500).json({
      error: "Error al generar Word judicial",
    });
  }
});

/**
 * 🔹 GET /api/cases/:caseId/export/pdf-universal
 * FASE 9.2 — PDF neutral
 */
router.get("/:caseId/export/pdf-universal", async (req, res) => {
  try {
    const userId = req.user?._id;
    const { caseId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const caseSession = await CaseSession.findOne({
      _id: caseId,
      userId,
    }).lean();

    if (!caseSession) {
      return res.status(404).json({ error: "Caso no encontrado" });
    }

    const timeline = await buildAuditTimeline(caseId);

    const sections = [
      {
        heading: "Resumen estratégico",
        content: "Análisis estructurado del caso.",
      },
      {
        heading: "Línea de tiempo",
        content: timeline.map(
          (e) => `${e.at} — ${e.type}`
        ),
      },
    ];

    const buffer = await generateUniversalPdf({
      title: caseSession.title,
      sections,
      metadata: {
        subtitle: "Briefing jurídico neutral",
        footer: "Uso profesional",
      },
    });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="briefing-${caseId}.pdf"`
    );
    res.type("application/pdf");
    return res.send(buffer);
  } catch (err) {
    console.error("PDF universal error:", err);
    return res.status(500).json({
      error: "Error al generar PDF universal",
    });
  }
});

export default router;
