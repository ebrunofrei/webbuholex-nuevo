// backend/routes/jurisprudenciaEmbed.js
// ============================================================
// 🦉 BúhoLex | API de búsqueda semántica de jurisprudencia
// - GET /api/jurisprudencia/search-embed?q=texto&limit=5
// ============================================================

import express from "express";
import Jurisprudencia from "../models/Jurisprudencia.js";
import { embedText } from "../services/jurisEmbeddingsService.js";
import { cosineSimilarity } from "../utils/vectorMath.js";

const router = express.Router();

/**
 * GET /api/jurisprudencia/search-embed?q=texto&limit=5
 * Búsqueda semántica usando embeddings.
 */
router.get("/search-embed", async (req, res) => {
  try {
    const { q, limit = 5 } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({
        ok: false,
        error: "missing_q",
        msg: "Falta el parámetro q para búsqueda semántica.",
      });
    }

    const lim = Math.min(parseInt(limit, 10) || 5, 50);

    // 1. Embedding del texto ingresado
    const queryEmbedding = await embedText(q);

    // 2. Obtener sentencias con embedding presente
    const docs = await Jurisprudencia.find(
      { embedding: { $exists: true } },
      {
        titulo: 1,
        sumilla: 1,
        resumen: 1,
        materia: 1,
        organo: 1,
        numero: 1,
        fechaResolucion: 1,
        embedding: 1,
      }
    ).lean();

    if (!docs.length) {
      return res.json({
        ok: true,
        count: 0,
        items: [],
      });
    }

    // 3. Calcular similitud coseno
    const scored = docs.map((doc) => ({
      ...doc,
      score: cosineSimilarity(queryEmbedding, doc.embedding),
    }));

    // 4. Ordenar por score
    scored.sort((a, b) => b.score - a.score);

    // 5. Limitar resultados y quitar embedding
    const limited = scored.slice(0, lim).map((doc) => {
      const { embedding, ...rest } = doc;
      return rest;
    });

    return res.json({
      ok: true,
      count: limited.length,
      items: limited,
    });
  } catch (err) {
    console.error("[EmbedSearch Error]", err);
    return res.status(500).json({
      ok: false,
      error: "internal_error",
      msg: err.message || "Error en la búsqueda semántica.",
    });
  }
});

export default router;
