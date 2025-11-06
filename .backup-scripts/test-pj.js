// scripts/test-pj.js
import dotenv from "dotenv";
import path from "path";

// 👇 fuerza a usar el .env.development
dotenv.config({ path: path.resolve(process.cwd(), ".env.development") });

import mongoose from "mongoose";
import { fetchPoderJudicial } from "../backend/services/newsProviders/poderJudicialProvider.js";
import { Noticia } from "../backend/models/Noticia.js";

(async () => {
  try {
    console.log("🔌 Conectando a MongoDB...");
    console.log("🌍 URI:", process.env.MONGO_URI); // 👈 debería mostrar la URI real

    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const noticias = await fetchPoderJudicial({ max: 5 });
    console.log(`✅ Scrap finalizado. Noticias obtenidas: ${noticias.length}`);

    const count = await Noticia.countDocuments({ fuente: "Poder Judicial" });
    console.log(`📊 Total de noticias PJ en MongoDB: ${count}`);

    await mongoose.disconnect();
    console.log("🔌 Desconectado de MongoDB");
  } catch (err) {
    console.error("❌ Error en test-pj.js:", err.message);
  }
})();
