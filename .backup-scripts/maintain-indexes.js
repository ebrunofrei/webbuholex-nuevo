// /scripts/maintain-indexes.js  (ESM puro)
import dotenv from "dotenv";
dotenv.config({ path: "./backend/.env.development" });

import mongoose from "mongoose";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import robusto del modelo (default export) RESOLVIENDO RUTA DESDE /scripts
const NoticiaPath = path.resolve(__dirname, "../backend/models/Noticia.js");
const { default: Noticia } = await import(`file://${NoticiaPath}`);

const MONGO_URI =
  process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL || "";

if (!MONGO_URI) {
  console.error("❌ Falta MONGODB_URI en .env");
  process.exit(1);
}

try {
  await mongoose.connect(MONGO_URI, { maxPoolSize: 10 });
  console.log("✅ Conectado a Mongo. Creando índices…");

  await Noticia.syncIndexes(); // respeta los índices del schema
  console.log("✅ Índices OK");
} catch (err) {
  console.error("❌ Error creando índices:", err);
  process.exit(1);
} finally {
  await mongoose.connection.close();
}
