import express from "express";
import { getNoticias } from "../services/noticiasService.js";  // Asegúrate de que esta función esté correctamente implementada
import chalk from "chalk";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    // === Normalización de parámetros ===
    let { tipo = "general", especialidad = "todas", page = 1, limit = 12 } = req.query;

    // 🔧 Corrige pluralizaciones (compatibilidad total)
    tipo = tipo.toLowerCase();
    if (tipo.includes("juridica")) tipo = "juridica";
    if (tipo.includes("general")) tipo = "general";

    especialidad = especialidad.toLowerCase();

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
    console.error(chalk.red("❌ Error en /api/noticias:", err));
    return res.status(500).json({
      ok: false,
      error: err.message || "Error interno del servidor",
    });
  }
});

export default router;
