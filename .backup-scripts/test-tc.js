import { connectDB, disconnectDB } from "../backend/services/db.js";
import { Noticia } from "../backend/models/Noticia.js";
import { fetchTC } from "../backend/services/newsProviders/tcProvider.js";

(async () => {
  console.log("=== Test Tribunal Constitucional ===");

  try {
    await connectDB();

    const noticias = await fetchTC({ max: 5 });
    console.log("📰 Noticias obtenidas:", noticias.length);

    const count = await Noticia.countDocuments({ fuente: "Tribunal Constitucional" });
    console.log("📊 Total noticias TC en MongoDB:", count);

  } catch (err) {
    console.error("❌ Error en test-tc.js:", err.message);
  } finally {
    await disconnectDB();
  }
})();
