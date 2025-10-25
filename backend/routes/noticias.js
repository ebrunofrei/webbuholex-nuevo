import express from "express";
import { getNoticias } from "../services/noticiasService.js";  // Asegúrate de que esta función esté correctamente implementada
import chalk from "chalk";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    // === Normalización de parámetros ===
    let { tipo = "general", especialidad = "todas", page = 1, limit = 12 } = req.query;

    // Validación de tipo (aseguramos que solo se usen valores válidos)
    tipo = tipo.toLowerCase();
    if (!["general", "juridica"].includes(tipo)) {
      return res.status(400).json({ ok: false, error: "Tipo de noticia inválido" });
    }

    // Validación de especialidad (aseguramos que solo se usen valores válidos)
    especialidad = especialidad.toLowerCase();

    // Validación de page y limit (aseguramos que sean números válidos)
    page = parseInt(page, 10);
    limit = parseInt(limit, 10);

    if (isNaN(page) || page <= 0) page = 1; // Fallback si page es inválido
    if (isNaN(limit) || limit <= 0) limit = 12; // Fallback si limit es inválido

    // === Obtener noticias ===
    const data = await getNoticias({ tipo, especialidad, page, limit });

    // === Respuesta estándar ===
    return res.json({
      ok: true,
      tipo,
      especialidad,
      total: data?.total || 0,
      items: data?.items || [],
      hasMore: data?.hasMore || false,
    });
  } catch (err) {
    console.error(chalk.red("❌ Error en /api/noticias:", err.message));
    return res.status(500).json({
      ok: false,
      error: err.message || "Error interno del servidor",
    });
  }
});

export default router;
