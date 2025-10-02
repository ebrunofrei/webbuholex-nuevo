import { Router } from "express";
import axios from "axios";
import { actualizarNoticiasYJurisprudencia } from "#services/noticiasJuridicasService.js";

const router = Router();

// Configuración GNews
const GNEWS_API_KEY = process.env.GNEWS_API_KEY;
const GNEWS_URL = "https://gnews.io/api/v4/top-headlines";

// Utilidad: normalizar artículos
function normalizarArticulos(articles = []) {
  return (articles || []).map((a) => ({
    titulo: a.title || "Sin título",
    resumen: a.description || "",
    enlace: a.url || "#",
    imagen: a.image || null,
    fecha: a.publishedAt || new Date().toISOString(),
    fuente: a.source?.name || "GNews",
  }));
}

// =============================
// 📌 Endpoint unificado
// GET /api/noticias?tipo=general|juridica&page=1&pageSize=10
// =============================
router.get("/", async (req, res) => {
  const { tipo = "general", page = 1, pageSize = 10, q = "peru" } = req.query;

  try {
    let items = [];
    let total = 0;
    let hasMore = false;

    if (tipo === "juridica") {
      // Jurídicas desde servicio
      const resultado = await actualizarNoticiasYJurisprudencia({
        page: parseInt(page, 10),
        limit: parseInt(pageSize, 10),
        q,
      });
      items = resultado?.items || [];
      total = resultado?.total || items.length;
      hasMore = resultado?.hasMore || false;
    } else {
      // Generales desde GNews
      if (!GNEWS_API_KEY) {
        return res.status(500).json({
          ok: false,
          error: "Falta configurar GNEWS_API_KEY en backend",
        });
      }

      const response = await axios.get(GNEWS_URL, {
        params: {
          q,
          lang: "es",
          country: "pe",
          max: pageSize,
          token: GNEWS_API_KEY,
        },
        timeout: 10000,
        headers: { "User-Agent": "BuholexNoticiasBot/1.0" },
      });

      items = normalizarArticulos(response.data.articles);
      total = items.length;
      hasMore = false; // GNews no expone paginación real
    }

    return res.json({
      ok: true,
      tipo,
      items,
      total,
      hasMore,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10),
    });
  } catch (err) {
    console.error("❌ [NoticiasRouter] Error en /api/noticias:", err.message);
    return res.status(500).json({
      ok: false,
      error: "Error cargando noticias.",
    });
  }
});

export default router;
