// ============================================================
// 🦉 BÚHOLEX | ANALYSES ROUTER — Canonical Enterprise
// ============================================================
// Dominio: ANÁLISIS (CaseSession)
// - Un Análisis pertenece a un CONTEXTO (Case)
// - NO guarda mensajes (eso es CaseMessage)
// - NO ejecuta IA
// - Multi-tenant por userId
// ============================================================

import express from "express";
import mongoose from "mongoose";
import Case from "../models/Case.js";
import CaseSession from "../models/CaseSession.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = express.Router();

/* ============================================================
   🔹 GET /api/analyses?caseId=XXX
   Lista análisis de un contexto
============================================================ */
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { caseId } = req.query;

    if (!caseId || !mongoose.Types.ObjectId.isValid(caseId)) {
      return res.status(400).json({
        ok: false,
        error: "caseId inválido",
      });
    }

    // Verificar que el contexto pertenece al usuario
    const exists = await Case.exists({ _id: caseId, usuarioId: userId });
    if (!exists) {
      return res.status(404).json({
        ok: false,
        error: "Contexto no encontrado",
      });
    }

    const analyses = await CaseSession.find({
      caseId,
      userId,
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      ok: true,
      analyses,
    });
  } catch (err) {
    console.error("❌ GET /api/analyses:", err);
    return res.status(500).json({
      ok: false,
      error: "Error al listar análisis",
    });
  }
});

/* ============================================================
   🔹 POST /api/analyses
   Crea un nuevo análisis en un contexto
============================================================ */
router.post("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { caseId, title } = req.body || {};

    if (!caseId || !mongoose.Types.ObjectId.isValid(caseId)) {
      return res.status(400).json({
        ok: false,
        error: "caseId inválido",
      });
    }

    const contexto = await Case.findOne({
      _id: caseId,
      usuarioId: userId,
    });

    if (!contexto) {
      return res.status(404).json({
        ok: false,
        error: "Contexto no encontrado",
      });
    }

    const analysis = await CaseSession.create({
      caseId,
      userId,
      title: title?.trim() || "Análisis jurídico",
      status: "abierto",
    });

    return res.status(201).json({
      ok: true,
      analysis,
      sessionId: analysis._id.toString(), // 🔑 sesión = análisis
    });
  } catch (err) {
    console.error("❌ POST /api/analyses:", err);
    return res.status(500).json({
      ok: false,
      error: "No se pudo crear el análisis",
    });
  }
});

/* ============================================================
   🔹 PATCH /api/analyses/:analysisId
   Renombrar / archivar / restaurar análisis
============================================================ */
router.patch("/:analysisId", requireAuth, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { analysisId } = req.params;
    const { title, status } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(analysisId)) {
      return res.status(400).json({
        ok: false,
        error: "analysisId inválido",
      });
    }

    const updated = await CaseSession.findOneAndUpdate(
      { _id: analysisId, userId },
      {
        ...(title && { title: title.trim() }),
        ...(status && { status }),
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        ok: false,
        error: "Análisis no encontrado",
      });
    }

    return res.json({
      ok: true,
      analysis: updated,
    });
  } catch (err) {
    console.error("❌ PATCH /api/analyses/:analysisId:", err);
    return res.status(500).json({
      ok: false,
      error: "Error al actualizar análisis",
    });
  }
});

/* ============================================================
   🔹 DELETE /api/analyses/:analysisId
   Eliminar análisis
============================================================ */
router.delete("/:analysisId", requireAuth, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { analysisId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(analysisId)) {
      return res.status(400).json({
        ok: false,
        error: "analysisId inválido",
      });
    }

    const deleted = await CaseSession.findOneAndDelete({
      _id: analysisId,
      userId,
    });

    if (!deleted) {
      return res.status(404).json({
        ok: false,
        error: "Análisis no encontrado",
      });
    }

    return res.json({
      ok: true,
      deleted: true,
    });
  } catch (err) {
    console.error("❌ DELETE /api/analyses/:analysisId:", err);
    return res.status(500).json({
      ok: false,
      error: "Error al eliminar análisis",
    });
  }
});

export default router;
