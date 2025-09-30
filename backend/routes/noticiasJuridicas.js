// backend/routes/noticiasJuridicas.js
import express from "express";
import { actualizarNoticiasYJurisprudencia } from "#services/noticiasJuridicasService.js";

const router = express.Router();

// Noticias Jurídicas (para Oficina Virtual)
router.get("/", async (req, res) => {
  try {
    const total = await actualizarNoticiasYJurisprudencia();
    res.json({ ok: true, tipo: "juridicas", total });
  } catch (err) {
    console.error("❌ Error en noticias jurídicas:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
