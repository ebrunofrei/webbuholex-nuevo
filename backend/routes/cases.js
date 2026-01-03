// ============================================================
// 🦉 BÚHOLEX | CASES ROUTER — Canonical Enterprise
// ============================================================
// Dominio: EXPEDIENTES / CASOS
// - Un Caso = un expediente jurídico
// - NO guarda mensajes
// - NO guarda razonamiento IA
// - Multi-tenant por usuarioId (Firebase UID)
// ============================================================

import express from "express";
import Case from "../models/Case.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = express.Router();

// ============================================================
// 🔹 GET /api/cases
// Lista los casos del usuario (sidebar / bootstrap)
// ============================================================

router.get("/", requireAuth, async (req, res) => {
  try {
    const usuarioId = req.user.uid;

    const casos = await Case.find({ usuarioId })
      .sort({ updatedAt: -1 })
      .lean();

    return res.json({
      ok: true,
      cases: casos,
    });
  } catch (err) {
    console.error("❌ GET /api/cases:", err);
    return res.status(500).json({
      ok: false,
      error: "Error al listar casos",
    });
  }
});

// ============================================================
// 🔹 POST /api/cases
// Crea un nuevo caso (manual o auto-create SaaS)
// ============================================================

router.post("/", requireAuth, async (req, res) => {
  try {
    const usuarioId = req.user.uid;
    const { titulo, descripcion } = req.body || {};

    const nuevoCaso = await Case.create({
      usuarioId,
      titulo: titulo?.trim() || "Caso inicial",
      descripcion: descripcion?.trim() || "",
      estado: "activo",
    });

    return res.status(201).json({
      ok: true,
      case: nuevoCaso,
      sessionId: `case_${nuevoCaso._id}`, // 🔑 canónico IA
    });
  } catch (err) {
    console.error("❌ POST /api/cases:", err);
    return res.status(500).json({
      ok: false,
      error: "No se pudo crear el caso",
    });
  }
});

// ============================================================
// 🔹 GET /api/cases/:caseId
// Obtiene metadata del caso (NO mensajes)
// ============================================================

router.get("/:caseId", requireAuth, async (req, res) => {
  try {
    const usuarioId = req.user.uid;
    const { caseId } = req.params;

    const caso = await Case.findOne({
      _id: caseId,
      usuarioId,
    }).lean();

    if (!caso) {
      return res.status(404).json({
        ok: false,
        error: "Caso no encontrado",
      });
    }

    return res.json({
      ok: true,
      case: caso,
      sessionId: `case_${caseId}`, // informativo
    });
  } catch (err) {
    console.error("❌ GET /api/cases/:caseId:", err);
    return res.status(500).json({
      ok: false,
      error: "Error al obtener caso",
    });
  }
});

// ============================================================
// 🔹 PATCH /api/cases/:caseId
// Actualiza metadata del caso
// ============================================================

router.patch("/:caseId", requireAuth, async (req, res) => {
  try {
    const usuarioId = req.user.uid;
    const { caseId } = req.params;
    const { titulo, descripcion, estado } = req.body || {};

    const updated = await Case.findOneAndUpdate(
      { _id: caseId, usuarioId },
      {
        ...(titulo && { titulo }),
        ...(descripcion && { descripcion }),
        ...(estado && { estado }),
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        ok: false,
        error: "Caso no encontrado",
      });
    }

    return res.json({
      ok: true,
      case: updated,
    });
  } catch (err) {
    console.error("❌ PATCH /api/cases/:caseId:", err);
    return res.status(500).json({
      ok: false,
      error: "Error al actualizar caso",
    });
  }
});

export default router;
