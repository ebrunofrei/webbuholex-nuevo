import express from "express";

// ===============================
// AUDITORÍA
// ===============================
import { registerAuditEvent } from "../services/audit/auditService.js";
import { rollbackToEvent } from "../services/audit/rollbackService.js";

// ===============================
// BORRADORES
// ===============================
import { saveDraftSnapshot } from "../services/draft/draftService.js";

// ===============================
// EXPORTACIÓN
// ===============================
import { generateJudicialWord } from "../services/export/wordExportService.js";
import { generateJudicialPdf } from "../services/export/pdfExportService.js";
import { createExportVersion } from "../services/export/exportVersionService.js";

const router = express.Router();

/* ============================================================================
   POST /api/actions/rollback
   C.3.4 — Rollback jurídico auditado
============================================================================ */
router.post("/rollback", async (req, res) => {
  try {
    const { caseId, eventId } = req.body;
    const userId = req.user?._id || "anon";

    if (!caseId || !eventId) {
      return res.status(400).json({ error: "Payload inválido" });
    }

    const result = await rollbackToEvent({
      caseId,
      targetEventId: eventId,
      actor: { userId },
    });

    return res.json({ ok: true, result });
  } catch (err) {
    console.error("❌ rollback:", err);
    return res.status(500).json({ error: "Error en rollback" });
  }
});

/* ============================================================================
   POST /api/actions/execute
   UX-6.x — Ejecución controlada y auditable
============================================================================ */
router.post("/execute", async (req, res) => {
  try {
    const { caseId, chatId, action, confirmation } = req.body;
    const userId = req.user?._id || "anon";

    // ===============================
    // VALIDACIONES
    // ===============================
    if (!confirmation?.confirmedByUser) {
      return res.status(400).json({ error: "Acción no confirmada" });
    }

    if (!caseId || !action?.type) {
      return res.status(400).json({ error: "Payload inválido" });
    }

    // ===============================
    // RESULTADO BASE
    // ===============================
    let result = {
      ok: true,
      summary: `Acción ${action.type} confirmada`,
    };

    /* ============================================================
       C.2 — GUARDAR BORRADOR (SNAPSHOT)
    ============================================================ */
    if (action.type === "SAVE_DRAFT") {
      const { snapshot } = action.payload || {};

      if (!snapshot || typeof snapshot !== "object") {
        return res.status(400).json({ error: "Snapshot inválido" });
      }

      const saved = await saveDraftSnapshot({
        caseId,
        chatId,
        userId,
        snapshot,
        meta: {
          cognitiveMode: snapshot?.cognitive?.mode,
          materia: snapshot?.materia,
          pais: snapshot?.pais,
        },
      });

      result = {
        ok: true,
        refId: saved.draftId,
        summary: "Borrador guardado correctamente",
      };
    }

    /* ============================================================
       C.3.2 — EXPORTACIÓN VERSIONADA (WORD / PDF)
    ============================================================ */
    if (action.type === "EXPORT_WORD" || action.type === "EXPORT_PDF") {
      const { snapshotId, briefing } = action.payload || {};

      if (!snapshotId || !briefing) {
        return res.status(400).json({ error: "snapshotId y briefing requeridos" });
      }

      let file;

      if (action.type === "EXPORT_WORD") {
        file = await generateJudicialWord({ briefing });
      }

      if (action.type === "EXPORT_PDF") {
        const buffer = await generateJudicialPdf({
          caseSession: briefing.caseSession,
          timeline: briefing.timeline || [],
        });

        file = {
          filename: `export_${Date.now()}.pdf`,
          buffer,
          mime: "application/pdf",
          size: buffer.length,
        };
      }

      const version = await createExportVersion({
        caseId,
        chatId,
        type: action.type === "EXPORT_WORD" ? "WORD" : "PDF",
        snapshotId,
        file: {
          filename: file.filename,
          path: file.path || null,
          mime: file.mime,
          size: file.size || null,
        },
        meta: {
          generatedBy: userId,
          tool: "litisbot",
        },
      });

      return res.json({
        ok: true,
        version: version.version,
        file: file.filename,
      });
    }

    // ===============================
    // REGISTRO AUDITABLE (ÚNICO)
    // ===============================
    await registerAuditEvent({
      caseId,
      chatId,
      action,
      confirmation,
      actor: {
        userId,
        role: "usuario",
      },
      result,
    });

    return res.json({
      ok: true,
      action: action.type,
      result,
    });
  } catch (err) {
    console.error("❌ execute:", err);
    return res.status(500).json({ error: "Error ejecutando acción" });
  }
});

export default router;
