// ============================================================================
// 🗂️ drafts.routes.js — Gestión de borradores (FASE C.2)
// ----------------------------------------------------------------------------
// - Listar snapshots
// - Obtener snapshot
// - Preparado para rehidratación / autosave
// ============================================================================

import express from "express";
import DraftSnapshot from "../models/DraftSnapshot.js";
import { saveDraftSnapshot } from "../services/draft/draftService.js";

const router = express.Router();

/* ============================================================================
   GET /api/drafts?caseId=&chatId=
   Lista snapshots recientes
============================================================================ */
router.get("/", async (req, res) => {
  try {
    const { caseId, chatId } = req.query;

    if (!caseId) {
      return res.status(400).json({ error: "caseId requerido" });
    }

    const query = {
      caseId,
      ...(chatId ? { chatId } : {}),
    };

    const drafts = await DraftSnapshot.find(query)
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return res.json({
      ok: true,
      drafts: drafts.map((d) => ({
        id: d._id,
        caseId: d.caseId,
        chatId: d.chatId,
        createdAt: d.createdAt,
        meta: d.meta || {},
      })),
    });
  } catch (err) {
    console.error("❌ [drafts:list]", err);
    return res.status(500).json({
      error: "No se pudieron cargar los borradores",
    });
  }
});

/* ============================================================================
   GET /api/drafts/:id
   Recupera snapshot completo
============================================================================ */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const draft = await DraftSnapshot.findById(id).lean();

    if (!draft) {
      return res.status(404).json({ error: "Borrador no encontrado" });
    }

    return res.json({
      ok: true,
      draft: {
        id: draft._id,
        caseId: draft.caseId,
        chatId: draft.chatId,
        snapshot: draft.snapshot,
        meta: draft.meta || {},
        createdAt: draft.createdAt,
      },
    });
  } catch (err) {
    console.error("❌ [drafts:get]", err);
    return res.status(500).json({
      error: "Error al recuperar el borrador",
    });
  }
});

/* ============================================================================
   POST /api/drafts
   Guardado explícito de snapshot (FASE C.2.1 / C.2.3)
============================================================================ */
router.post("/", async (req, res) => {
  try {
    const {
      caseId,
      chatId,
      messages,
      cognitiveContext,
      meta = {},
    } = req.body;

    if (!caseId || !Array.isArray(messages)) {
      return res.status(400).json({
        error: "Payload inválido para snapshot",
      });
    }

    const snapshot = await saveDraftSnapshot({
      caseId,
      chatId,
      messages,
      cognitiveContext,
      meta,
    });

    return res.json({
      ok: true,
      draftId: snapshot._id,
      createdAt: snapshot.createdAt,
    });
  } catch (err) {
    console.error("❌ [drafts:save]", err);
    return res.status(500).json({
      error: "No se pudo guardar el borrador",
    });
  }
});

export default router;
