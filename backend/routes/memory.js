// routes/memory.js
import { db } from "#services/myFirebaseAdmin.js"; // ✅ Usa SIEMPRE este
import { Router } from "express";

const router = Router();

/**
 * 📝 Guardar mensaje en memoria
 */
router.post("/", async (req, res) => {
  try {
    const { usuarioId, expedienteId, pregunta, respuesta } = req.body || {};

    if (!usuarioId || !pregunta || !respuesta) {
      return res.status(400).json({
        success: false,
        error: "Faltan datos obligatorios (usuarioId, pregunta, respuesta).",
      });
    }

    const ref = await db.collection("memoria").add({
      usuarioId,
      expedienteId: expedienteId || null,
      pregunta: pregunta.trim(),
      respuesta: respuesta.trim(),
      fecha: new Date(),
    });

    return res.json({
      success: true,
      id: ref.id,
      message: "Memoria guardada correctamente.",
    });
  } catch (err) {
    console.error("❌ Error guardando memoria:", err);
    return res.status(500).json({
      success: false,
      error: "Error guardando memoria.",
    });
  }
});

/**
 * 📜 Obtener historial de usuario
 * Query params: usuarioId (req), expedienteId (opcional), limit (opcional, default 10)
 */
router.get("/", async (req, res) => {
  try {
    const { usuarioId, expedienteId, limit = 10 } = req.query;

    if (!usuarioId) {
      return res.status(400).json({
        success: false,
        error: "usuarioId es requerido.",
      });
    }

    let query = db.collection("memoria").where("usuarioId", "==", usuarioId);
    if (expedienteId) {
      query = query.where("expedienteId", "==", expedienteId);
    }

    const snap = await query
      .orderBy("fecha", "desc")
      .limit(parseInt(limit, 10) || 10)
      .get();

    const historial = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json({
      success: true,
      total: historial.length,
      historial,
    });
  } catch (err) {
    console.error("❌ Error cargando historial:", err);
    return res.status(500).json({
      success: false,
      error: "Error cargando historial.",
    });
  }
});

/**
 * 🗑️ Eliminar historial (por usuarioId o expedienteId)
 * Body: { usuarioId, expedienteId? }
 */
router.delete("/", async (req, res) => {
  try {
    const { usuarioId, expedienteId } = req.body || {};

    if (!usuarioId) {
      return res.status(400).json({
        success: false,
        error: "usuarioId es requerido para eliminar historial.",
      });
    }

    let query = db.collection("memoria").where("usuarioId", "==", usuarioId);
    if (expedienteId) {
      query = query.where("expedienteId", "==", expedienteId);
    }

    const snap = await query.get();
    const batch = db.batch();

    snap.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    return res.json({
      success: true,
      deleted: snap.size,
      message: `Se eliminaron ${snap.size} registros de memoria.`,
    });
  } catch (err) {
    console.error("❌ Error eliminando historial:", err);
    return res.status(500).json({
      success: false,
      error: "Error eliminando historial.",
    });
  }
});

export default router;
