// backend/services/fuenteLegalService.js
import { db } from "#services/myFirebaseAdmin.js"; // Firestore (si lo necesitas)
import { MongoClient } from "mongodb";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const client = new MongoClient(MONGO_URI);

let mongoDb;
async function connectMongo() {
  if (!mongoDb) {
    await client.connect();
    mongoDb = client.db("legalbot"); // 👈 renombrado para evitar choque
    console.log("✅ MongoDB conectado en fuenteLegalService");
  }
}
await connectMongo();

/**
 * Guardar fuente en Firestore + Mongo
 */
export async function guardarFuente(usuarioId, fuente, datos) {
  // Guardar en Firestore
  await db.collection("fuentes_legales").add({
    usuarioId,
    fuente,
    datos,
    fecha: new Date(),
  });

  // Guardar en Mongo
  await mongoDb.collection("fuentes_cache").insertOne({
    usuarioId,
    fuente,
    datos,
    fecha: new Date(),
  });

  return { ok: true };
}

/**
 * Buscar fuentes legales en Mongo
 */
export async function buscarFuentesLegales(query = {}) {
  if (!mongoDb) await connectMongo();

  const resultados = await mongoDb
    .collection("fuentes_cache")
    .find(query)
    .sort({ fecha: -1 })
    .limit(20)
    .toArray();

  return resultados;
}
