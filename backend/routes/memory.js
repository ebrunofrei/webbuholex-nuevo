import { Router } from "express";
import { db } from "../utils/firebase-admin.js"; // O tu conector MongoDB

const router = Router();

// Guardar mensaje en memoria
router.post("/", async (req, res) => {
  const { usuarioId, expedienteId, pregunta, respuesta } = req.body;
  await db.collection("memoria").add({
    usuarioId, expedienteId, pregunta, respuesta, fecha: new Date()
  });
  res.json({ ok: true });
});

// Traer historial
router.get("/", async (req, res) => {
  const { usuarioId, expedienteId } = req.query;
  let query = db.collection("memoria").where("usuarioId", "==", usuarioId);
  if (expedienteId) query = query.where("expedienteId", "==", expedienteId);
  const snap = await query.orderBy("fecha", "desc").limit(10).get();
  const historial = snap.docs.map(doc => doc.data());
  res.json({ historial });
});

export default router;
