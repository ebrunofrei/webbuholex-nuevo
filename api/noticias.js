// backend/routes/noticias.js
import express from "express";
import { getNoticiasGenerales, getNoticiasJuridicas } from "../services/noticiasService.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const tipo = req.query.tipo || "general";
  try {
    let items = [];
    if (tipo === "juridicas") {
      items = await getNoticiasJuridicas();
    } else {
      items = await getNoticiasGenerales();
    }

    res.json({
      ok: true,
      total: items.length,
      items,
      hasMore: false,
    });
  } catch (err) {
    console.error("❌ Error noticias:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
