// backend/routes/noticiasGuardadas.js
import { Router } from "express";
import Usuario from "../models/Usuario.js";

const router = Router();

/**
 * GET /api/noticias-guardadas?userId=UID
 */
router.get("/", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "userId requerido" });

    const usuario = await Usuario.findOne({ uid: userId })
      .populate("noticiasGuardadas", "titulo fuente fecha enlace tipo")
      .lean();

    res.json(usuario?.noticiasGuardadas || []);
  } catch (err) {
    console.error("❌ Error GET /noticias-guardadas:", err.message);
    res.status(500).json({ error: "Error al obtener noticias guardadas" });
  }
});

/**
 * POST /api/noticias-guardadas
 */
router.post("/", async (req, res) => {
  try {
    const { userId, guardadas } = req.body;
    if (!userId || !Array.isArray(guardadas)) {
      return res.status(400).json({ error: "Parámetros inválidos" });
    }

    const usuario = await Usuario.findOneAndUpdate(
      { uid: userId },
      { noticiasGuardadas: guardadas },
      { upsert: true, new: true }
    )
      .populate("noticiasGuardadas", "titulo fuente fecha enlace tipo")
      .lean();

    res.json({ ok: true, noticiasGuardadas: usuario.noticiasGuardadas });
  } catch (err) {
    console.error("❌ Error POST /noticias-guardadas:", err.message);
    res.status(500).json({ error: "Error al actualizar noticias guardadas" });
  }
});

export default router;
