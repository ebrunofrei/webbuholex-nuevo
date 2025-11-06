// scripts/cleanup-dummy.js
import mongoose from "mongoose";
import Usuario from "../backend/models/Usuario.js";
import { Noticia } from "../backend/models/Noticia.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/buholex";

async function cleanupDummy() {
  try {
    console.log("🧹 Conectando a MongoDB...");
    await mongoose.connect(MONGO_URI, { dbName: "buholex" });

    // Eliminar usuario dummy
    const userRes = await Usuario.deleteOne({ uid: "dummy" });
    if (userRes.deletedCount > 0) {
      console.log("👤 Usuario dummy eliminado.");
    } else {
      console.log("ℹ️ No se encontró usuario dummy.");
    }

    // Eliminar noticia dummy
    const noticiaRes = await Noticia.deleteOne({ enlace: "http://test.com" });
    if (noticiaRes.deletedCount > 0) {
      console.log("📰 Noticia dummy eliminada.");
    } else {
      console.log("ℹ️ No se encontró noticia dummy.");
    }

    await mongoose.disconnect();
    console.log("✅ Limpieza completada. Colecciones listas para producción.");
  } catch (err) {
    console.error("❌ Error en cleanup:", err.message);
    process.exit(1);
  }
}

cleanupDummy();
