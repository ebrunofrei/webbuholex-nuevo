// backend/routes/noticiasGenerales.js
import express from "express";
import { actualizarNoticiasGenerales } from "#services/noticiasGeneralesService.js";

const router = express.Router();

/**
 * GET /api/noticias
 * Devuelve noticias generales para el Home
 */
router.get("/", async (req, res) => {
  try {
    const noticias = await actualizarNoticiasGenerales();

    // Normaliza salida → siempre array
    const items = Array.isArray(noticias) ? noticias : [];
    res.json({
      ok: true,
      tipo: "generales",
      items,
      total: items.length,
    });
  } catch (err) {
    console.error("❌ Error en noticias generales:", err.message);
    res.status(500).json({
      ok: false,
      error: err.message,
      items: [],
      total: 0,
    });
  }
});

export default router;
