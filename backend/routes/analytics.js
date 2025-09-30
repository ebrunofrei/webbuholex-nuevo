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
