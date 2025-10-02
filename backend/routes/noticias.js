// backend/routes/noticias.js
import { Router } from "express";
import axios from "axios";
import { actualizarNoticias } from "#services/noticiasService.js";
import { actualizarNoticiasYJurisprudencia } from "#services/noticiasJuridicasService.js";

const router = Router();

// 🔑 API Key de GNews (guardar en .env)
const GNEWS_API_KEY = process.env.GNEWS_API_KEY;
const GNEWS_URL = "https://gnews.io/api/v4/top-headlines";

// =====================
// Función utilitaria
// =====================
function normalizarArticulos(articles = []) {
  return (articles || []).map((a) => ({
    titulo: a.title || "Sin título",
    resumen: a.description || "",
    enlace: a.url || "#", // 👈 importante: frontend espera "enlace"
    imagen: a.image || null,
    fecha: a.publishedAt || new Date().toISOString(),
    fuente: a.source?.name || "GNews",
  }));
}

// =====================
// 📌 Noticias Jurídicas
// GET /api/noticias/juridicas
// =====================
router.get("/juridicas", async (req, res) => {
  try {
    const { page = 1, limit = 12, q = null } = req.query;

    const resultado = await actualizarNoticiasYJurisprudencia({
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      q,
    });

    return res.json({
      ok: true,
      tipo: "juridicas",
      items: resultado?.items || [],
      total: resultado?.total || 0,
      hasMore: resultado?.hasMore || false,
      message: `✅ Se cargaron ${resultado?.items?.length || 0} noticias jurídicas.`,
    });
  } catch (err) {
    console.error("❌ [NoticiasRouter] Error en /juridicas:", err);
    return res.status(500).json({
      ok: false,
      error: "Error cargando noticias jurídicas.",
      detalle: err.message,
    });
  }
});

// =====================
// 📌 Noticias Generales (GNews)
// GET /api/noticias/generales?q=peru&lang=es
// =====================
router.get("/generales", async (req, res) => {
  try {
    if (!GNEWS_API_KEY) {
      throw new Error("⚠️ Falta configurar GNEWS_API_KEY en .env");
    }

    const { q = "peru", lang = "es", country = "pe", max = 10 } = req.query;

    const response = await axios.get(GNEWS_URL, {
      params: { q, lang, country, max, token: GNEWS_API_KEY },
      timeout: 10000,
      headers: { "User-Agent": "NoticiasBot/1.0" },
    });

    const items = normalizarArticulos(response.data.articles);

    return res.json({
      ok: true,
      tipo: "generales",
      total: items.length,
      items,
      message: `✅ Noticias generales cargadas desde GNews (${items.length}).`,
    });
  } catch (err) {
    console.error("❌ [NoticiasRouter] Error en /generales:", err.response?.data || err);
    return res.status(500).json({
      ok: false,
      error: "Error cargando noticias generales desde GNews.",
      detalle: err.message,
    });
  }
});

// =====================
// 📌 Noticias Combinadas
// GET /api/noticias
// =====================
router.get("/", async (_req, res) => {
  try {
    // Jurídicas desde servicio propio
    const juridicas = await actualizarNoticiasYJurisprudencia({ page: 1, limit: 6 });

    // Generales desde GNews
    let generales = [];
    if (GNEWS_API_KEY) {
      try {
        const response = await axios.get(GNEWS_URL, {
          params: { q: "peru", lang: "es", country: "pe", max: 6, token: GNEWS_API_KEY },
          timeout: 10000,
          headers: { "User-Agent": "NoticiasBot/1.0" },
        });
        generales = normalizarArticulos(response.data.articles);
      } catch (err) {
        console.warn("⚠️ [NoticiasRouter] Error cargando generales en /:", err.message);
      }
    }

    return res.json({
      ok: true,
      message: "✅ Noticias combinadas cargadas.",
      juridicas: juridicas?.items || [],
      generales,
    });
  } catch (err) {
    console.error("❌ [NoticiasRouter] Error en /:", err);
    return res.status(500).json({
      ok: false,
      error: "Error cargando noticias combinadas.",
      detalle: err.message,
    });
  }
});

export default router;
