// scripts/reset-noticias.js
import mongoose from "mongoose";
import { Noticia } from "../backend/models/Noticia.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/buholex";

async function resetNoticias() {
  try {
    console.log("🧹 Conectando a MongoDB...");
    await mongoose.connect(MONGO_URI, { dbName: "buholex" });

    // Vaciar colección de noticias
    const result = await Noticia.deleteMany({});
    console.log(`📰 Eliminadas ${result.deletedCount} noticias.`);

    await mongoose.disconnect();
    console.log("✅ Reset completado. Índices intactos, colección vacía.");
  } catch (err) {
    console.error("❌ Error en reset-noticias:", err.message);
    process.exit(1);
  }
}

resetNoticias();
