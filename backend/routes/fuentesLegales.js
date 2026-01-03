// backend/routes/fuentesLegales.js
// ============================================================
// GET /api/fuentes-legales
// Filtros:
//   ?tipo=jurisprudencia|norma|noticia|doctrina|boletin
//   ?relevancia=alta|media|baja
//   ?tag=Prescripción
//   ?materia=Civil
//   ?jurisdiccion=Perú
//   ?limit=10
// ============================================================

import { Router } from "express";
import { buscarFuentesLegales } from "#services/fuentesLegalesService.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const {
      tipo,
      relevancia,
      tag,
      materia,
      jurisdiccion,
      limit = 10,
    } = req.query || {};

    const tagsAI = [];
    if (tag) tagsAI.push(String(tag));

    const resultados = await buscarFuentesLegales({
      tipo: tipo || undefined,
      relevancia: relevancia || undefined,
      tagsAI,
      materia: materia || undefined,
      jurisdiccion: jurisdiccion || undefined,
      limit: Number(limit) || 10,
    });

    return res.json({
      ok: true,
      total: resultados.length,
      fuentes: resultados,
    });
  } catch (err) {
    console.error("❌ Error en GET /api/fuentes-legales:", err);
    return res
      .status(500)
      .json({ ok: false, error: "Error interno consultando fuentesLegales" });
  }
});

export default router;
