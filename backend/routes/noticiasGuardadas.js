// backend/routes/noticiasGuardadas.js
// ============================================================
// 🦉 BÚHOLEX | Noticias guardadas del usuario (robusto)
// - GET    /api/noticias-guardadas?userId=UID
// - POST   /api/noticias-guardadas          (reemplaza toda la lista)
// - PUT    /api/noticias-guardadas/add      (agrega una)
// - PUT    /api/noticias-guardadas/remove   (elimina una)
// ------------------------------------------------------------
// Requiere: Usuario.noticiasGuardadas: [ { type: ObjectId, ref: 'Noticia' } ]
// ============================================================
import { Router } from "express";
import mongoose from "mongoose";
import Usuario from "../models/Usuario.js";

const router = Router();

const { Types } = mongoose;
const MAX_SAVED = Number(process.env.MAX_SAVED_NEWS || 500);

// ---------- utils ----------
const isValidId = (v) => {
  try { return Types.ObjectId.isValid(v); } catch { return false; }
};

const toId = (v) => {
  if (!v) return null;
  if (Types.ObjectId.isValid(v)) return new Types.ObjectId(String(v));
  // si llega objeto { _id } | { id }
  if (typeof v === "object" && v !== null) {
    const cand = v._id || v.id;
    return Types.ObjectId.isValid(cand) ? new Types.ObjectId(String(cand)) : null;
  }
  return null;
};

const uniqueIds = (arr) => {
  const seen = new Set();
  const out = [];
  for (const id of arr) {
    const k = String(id);
    if (!seen.has(k)) { seen.add(k); out.push(id); }
  }
  return out;
};

async function populateAndSend(res, usuarioDoc) {
  const populated = await Usuario.findById(usuarioDoc._id)
    .populate("noticiasGuardadas", "titulo fuente fecha enlace tipo especialidad imagen")
    .lean();

  // ordena por fecha desc (siempre que haya fecha)
  const items = (populated?.noticiasGuardadas || []).slice().sort((a, b) => {
    const da = a?.fecha ? new Date(a.fecha).getTime() : 0;
    const db = b?.fecha ? new Date(b.fecha).getTime() : 0;
    return db - da;
  });

  return res.json({ ok: true, noticiasGuardadas: items });
}

// ---------- GET: listar ----------
router.get("/", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "userId requerido" });

    const usuario = await Usuario.findOne({ uid: userId })
      .populate("noticiasGuardadas", "titulo fuente fecha enlace tipo especialidad imagen")
      .lean();

    const items = (usuario?.noticiasGuardadas || []).slice().sort((a, b) => {
      const da = a?.fecha ? new Date(a.fecha).getTime() : 0;
      const db = b?.fecha ? new Date(b.fecha).getTime() : 0;
      return db - da;
    });

    return res.json(items);
  } catch (err) {
    console.error("❌ GET /noticias-guardadas:", err);
    return res.status(500).json({ error: "Error al obtener noticias guardadas" });
  }
});

// ---------- POST: reemplazar toda la lista ----------
router.post("/", async (req, res) => {
  try {
    const { userId, guardadas } = req.body || {};
    if (!userId || !Array.isArray(guardadas)) {
      return res.status(400).json({ error: "Parámetros inválidos (userId y guardadas[] requeridos)" });
    }

    const ids = uniqueIds(
      guardadas
        .map(toId)
        .filter(Boolean)
        .slice(0, MAX_SAVED)
    );

    const usuario = await Usuario.findOneAndUpdate(
      { uid: userId },
      { $set: { noticiasGuardadas: ids } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return populateAndSend(res, usuario);
  } catch (err) {
    console.error("❌ POST /noticias-guardadas:", err);
    return res.status(500).json({ error: "Error al actualizar noticias guardadas" });
  }
});

// ---------- PUT /add: agregar una ----------
router.put("/add", async (req, res) => {
  try {
    const { userId, noticiaId } = req.body || {};
    if (!userId || !noticiaId) {
      return res.status(400).json({ error: "Parámetros inválidos (userId y noticiaId requeridos)" });
    }
    if (!isValidId(noticiaId)) {
      return res.status(400).json({ error: "noticiaId inválido" });
    }

    const usuario = await Usuario.findOneAndUpdate(
      { uid: userId },
      { $addToSet: { noticiasGuardadas: new Types.ObjectId(String(noticiaId)) } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // recorta a MAX_SAVED si se pasó
    if (usuario.noticiasGuardadas.length > MAX_SAVED) {
      usuario.noticiasGuardadas = usuario.noticiasGuardadas.slice(-MAX_SAVED);
      await usuario.save();
    }

    return populateAndSend(res, usuario);
  } catch (err) {
    console.error("❌ PUT /noticias-guardadas/add:", err);
    return res.status(500).json({ error: "No se pudo agregar la noticia" });
  }
});

// ---------- PUT /remove: eliminar una ----------
router.put("/remove", async (req, res) => {
  try {
    const { userId, noticiaId } = req.body || {};
    if (!userId || !noticiaId) {
      return res.status(400).json({ error: "Parámetros inválidos (userId y noticiaId requeridos)" });
    }
    if (!isValidId(noticiaId)) {
      return res.status(400).json({ error: "noticiaId inválido" });
    }

    const usuario = await Usuario.findOneAndUpdate(
      { uid: userId },
      { $pull: { noticiasGuardadas: new Types.ObjectId(String(noticiaId)) } },
      { new: true }
    );

    // si el usuario aún no existía, devuelve lista vacía de forma idempotente
    if (!usuario) return res.json({ ok: true, noticiasGuardadas: [] });

    return populateAndSend(res, usuario);
  } catch (err) {
    console.error("❌ PUT /noticias-guardadas/remove:", err);
    return res.status(500).json({ error: "No se pudo eliminar la noticia" });
  }
});

export default router;
