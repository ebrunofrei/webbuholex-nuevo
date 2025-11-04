// scripts/check-indexes.js
import mongoose from "mongoose";
import { Noticia } from "../backend/models/Noticia.js";
import Usuario from "../backend/models/Usuario.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/buholex";

async function checkIndexes() {
  try {
    console.log("🔍 Conectando a MongoDB...");
    await mongoose.connect(MONGO_URI, { dbName: "buholex" });

    // Verificar índices en Noticia
    console.log("\n=== 📑 Índices en colección Noticia ===");
    const noticiaIndexes = await Noticia.collection.indexes();
    noticiaIndexes.forEach((idx) => console.log(idx));

    // Verificar índices en Usuario
    console.log("\n=== 👤 Índices en colección Usuario ===");
    const usuarioIndexes = await Usuario.collection.indexes();
    usuarioIndexes.forEach((idx) => console.log(idx));

    await mongoose.disconnect();
    console.log("\n✅ Verificación completada.");
  } catch (err) {
    console.error("❌ Error verificando índices:", err.message);
    process.exit(1);
  }
}

checkIndexes();
