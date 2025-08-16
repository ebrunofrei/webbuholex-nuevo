import express from "express";
const router = express.Router();

// Ejemplo con MongoDB:
router.get("/resumen", async (req, res) => {
  const db = req.app.locals.db; // o usa tu conexión
  // Consultas por día (últimos 7 días)
  const porDia = await db.collection("analytics").aggregate([
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$fecha" } },
        total: { $sum: 1 },
      }
    },
    { $sort: { _id: 1 } }
  ]).toArray();

  // Fuentes más usadas
  const porFuente = await db.collection("analytics").aggregate([
    {
      $group: {
        _id: "$fuente",
        total: { $sum: 1 }
      }
    },
    { $sort: { total: -1 } }
  ]).toArray();

  res.json({ porDia, porFuente });
});

export default router;
