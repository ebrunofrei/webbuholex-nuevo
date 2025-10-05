import mongoose from "mongoose";
import { fetchPoderJudicial } from "../backend/services/newsProviders/poderJudicialProvider.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/tu_db";

(async () => {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI, { dbName: "tu_db" });
      console.log("✅ Conectado a Mongo");
    }

    const noticias = await fetchPoderJudicial({ max: 3 });
    console.log("📦 Total retornadas:", noticias.length);
  } catch (err) {
    console.error("❌ Test PJ Save error:", err);
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
})();
