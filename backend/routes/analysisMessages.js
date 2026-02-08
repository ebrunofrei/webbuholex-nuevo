// ============================================================
// 🧠 BÚHOLEX | Analysis Messages Router (CANÓNICO)
// ============================================================
// Dominio: MENSAJES DE ANÁLISIS (CaseSession)
// - Persistencia de razonamiento
// - NO IA
// - NO prompts
// - Auditoría legal-grade
// ============================================================

import express from "express";
import AnalysisMessage from "../models/AnalysisMessage.js";
import CaseSession from "../models/CaseSession.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = express.Router();

/* ============================================================
   🔹 GET /api/analyses/:analysisId/messages
============================================================ */
router.get("/:analysisId/messages", requireAuth, async (req, res) => {
  try {
    const { analysisId } = req.params;
    const userId = req.user.uid;

    // 1️⃣ Validar sesión de análisis
    const session = await CaseSession.findOne({
      _id: analysisId,
      userId,
    }).lean();

    if (!session) {
      return res.status(404).json({
        ok: false,
        error: "Análisis no encontrado",
      });
    }

    // 2️⃣ Mensajes ordenados (acto jurídico cronológico)
    const messages = await AnalysisMessage.find({ analysisId })
      .sort({ createdAt: 1 })
      .lean();

    return res.json({
      ok: true,
      analysisId,
      messages,
    });
  } catch (err) {
    console.error("❌ GET analysis messages:", err);
    return res.status(500).json({
      ok: false,
      error: "Error al cargar mensajes del análisis",
    });
  }
});

/* ============================================================
   🔹 POST /api/analyses/:analysisId/messages
============================================================ */
router.post("/:analysisId/messages", requireAuth, async (req, res) => {
  try {
    const { analysisId } = req.params;
    const userId = req.user.uid;
    const { role, content, attachments = [] } = req.body || {};

    if (!role || !content) {
      return res.status(400).json({
        ok: false,
        error: "role y content son obligatorios",
      });
    }

    // 1️⃣ Validar sesión
    const session = await CaseSession.findOne({
      _id: analysisId,
      userId,
    });

    if (!session) {
      return res.status(404).json({
        ok: false,
        error: "Análisis no encontrado",
      });
    }

    // 2️⃣ Crear mensaje
    const message = await AnalysisMessage.create({
      analysisId,
      role,
      content,
      attachments,
      source: role === "assistant" ? "ai" : "human",
    });

    // 3️⃣ Actualizar actividad del análisis
    session.updatedAt = new Date();
    await session.save();

    return res.status(201).json({
      ok: true,
      message,
    });
  } catch (err) {
    console.error("❌ POST analysis message:", err);
    return res.status(500).json({
      ok: false,
      error: "No se pudo guardar el mensaje",
    });
  }
});

export default router;
