// backend/routes/noticiasGenerales.js
import express from "express";
import { actualizarNoticiasGenerales } from "#services/noticiasGeneralesService.js";

const router = express.Router();

// Noticias Generales (para el Home)
router.get("/", async (req, res) => {
  try {
    const total = await actualizarNoticiasGenerales();
    res.json({ ok: true, tipo: "generales", total });
  } catch (err) {
    console.error("❌ Error en noticias generales:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
