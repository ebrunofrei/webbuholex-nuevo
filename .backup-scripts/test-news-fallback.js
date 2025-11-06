import "dotenv/config";
import { fetchNoticias } from "../backend/services/noticiasService.js";

async function main() {
  console.log("\n=== 📰 Test Noticias con fallback ===");

  try {
    const noticias = await fetchNoticias("peru");
    console.log(`Noticias recibidas: ${noticias.length}`);

    if (noticias.length > 0) {
      console.log("Primer título:", noticias[0].titulo);
      console.log("Fuente:", noticias[0].fuente);
      console.log("Enlace:", noticias[0].enlace);
    } else {
      console.log("⚠️ No se recibieron noticias de ninguna fuente.");
    }
  } catch (err) {
    console.error("❌ Error en test:", err.message);
  }
}

main();
