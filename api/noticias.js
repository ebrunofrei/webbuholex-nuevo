// backend/routes/noticias.js
import express from "express";
import { db } from "#services/myFirebaseAdmin.js";
import { getNoticiasGenerales, getNoticiasJuridicas } from "../services/noticiasService.js";

const router = express.Router();
const CACHE_MINUTES = 30;

router.get("/", async (req, res) => {
  const tipo = req.query.tipo === "juridicas" ? "juridicas" : "generales";
  const coll = tipo === "juridicas" ? "noticias_juridicas" : "noticias_generales";

  try {
    // Buscar cache en Firestore
    const snap = await db.collection(coll).orderBy("fecha", "desc").limit(20).get();
    let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Si no hay cache, llamar al servicio y guardar
    if (!items.length) {
      console.log(`⚠️ Cache vacío. Descargando ${tipo}...`);
      items = tipo === "juridicas" ? await getNoticiasJuridicas() : await getNoticiasGenerales();

      const batch = db.batch();
      items.forEach((n) => {
        const ref = db.collection(coll).doc();
        batch.set(ref, { ...n, creadoEn: new Date() });
      });
      await batch.commit();
    }

    res.json({ ok: true, tipo, total: items.length, items, hasMore: false });
  } catch (err) {
    console.error("❌ Error noticias:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
