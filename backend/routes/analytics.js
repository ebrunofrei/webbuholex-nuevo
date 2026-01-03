import { db, auth, storage } from "#services/myFirebaseAdmin.js";
import express from "express";

const router = express.Router();

/**
 * 📊 Endpoint de resumen de analytics
 * Devuelve: 
 *  - porDia (últimos 7 días)
 *  - porFuente (fuentes más usadas)
 */
router.get("/resumen", async (req, res) => {
  try {
    const mongoDb = req.app.locals.db; // conexión Mongo inyectada en app

    if (!mongoDb) {
      return res.status(500).json({
        success: false,
        message: "No se encontró conexión a la base de datos.",
      });
    }

    // Consultas por día (últimos 7 días)
    const porDia = await mongoDb.collection("analytics").aggregate([
      {
        $match: {
          fecha: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // últimos 7 días
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$fecha" } },
          total: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]).toArray();

    // Fuentes más usadas
    const porFuente = await mongoDb.collection("analytics").aggregate([
      {
        $group: {
          _id: "$fuente",
          total: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 10 }, // opcional: top 10 fuentes
    ]).toArray();

    //------------------------------------------------------------------
// 🔥 7. POSTPROCESADOR DE RESPUESTA (Anti-Markdown + Negrita Legal)
//------------------------------------------------------------------
function limpiarMarkdownPeroMantenerNegrita(texto = "") {
  return texto
    // elimina encabezados markdown
    .replace(/#{1,6}\s*/g, "")
    // convierte negrita markdown **texto** → texto resaltado (sin asteriscos)
    .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
    // elimina cursivas *texto*
    .replace(/\*(.*?)\*/g, "$1")
    // bullets markdown a bullets formales
    .replace(/^\s*-\s+/gm, "• ")
    .replace(/^\s*\*\s+/gm, "• ")
    // evita saltos de línea excesivos
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function convertirAFormatoWord(texto = "") {
  let t = limpiarMarkdownPeroMantenerNegrita(texto);

  // Convertir encabezados típicos del bot a estilo Word procesal
  t = t.replace(/^\s*I\.\s*/i, "I. ");
  t = t.replace(/^\s*II\.\s*/i, "II. ");
  t = t.replace(/^\s*III\.\s*/i, "III. ");

  // Si el texto trae títulos sueltos, los convertimos
  t = t.replace(/^Introducción/i, "I. Introducción");
  t = t.replace(/^Fundamentos/i, "II. Fundamentos");
  t = t.replace(/^Conclusión/i, "III. Conclusión Estratégica");

  return t;
}

// aplicar transformación
respuesta = convertirAFormatoWord(respuesta);

    return res.json({
      success: true,
      porDia,
      porFuente,
    });
  } catch (error) {
    console.error("Error en /analytics/resumen:", error);
    return res.status(500).json({
      success: false,
      message: "Error al obtener resumen de analytics.",
    });
  }
});

export default router;
