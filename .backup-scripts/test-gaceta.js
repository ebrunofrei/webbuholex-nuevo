// scripts/test-gaceta.js
import { fetchGacetaJuridica } from "../backend/services/newsProviders/gacetaJuridicaProvider.js";

(async () => {
  console.log("=== 📰 Test Gaceta Jurídica (normalizadas) ===");

  try {
    const noticias = await fetchGacetaJuridica({ max: 5 });
    console.log(`✅ Noticias obtenidas: ${noticias.length}`);

    // Mostrar las primeras 2 en detalle
    noticias.slice(0, 2).forEach((n, i) => {
      console.log("\n-------------------------");
      console.log(`Noticia #${i + 1}`);
      console.log("Título:", n.titulo);
      console.log("Resumen:", n.resumen);
      console.log("Especialidad:", n.especialidad);
      console.log("Fuente:", n.fuente);
      console.log("Fecha:", n.fecha);
      console.log("URL:", n.url);
      console.log("Imagen:", n.imagen);
    });

  } catch (err) {
    console.error("❌ Error en test-gaceta:", err.message);
  }

  console.log("\n🟢 Prueba scraping finalizada.");
})();
