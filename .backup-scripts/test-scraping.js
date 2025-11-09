// scripts/test-scraping.js
import { fetchGNews } from "../backend/services/newsProviders/gnewsProvider.js";
import { fetchNewsAPI } from "../backend/services/newsProviders/newsApiProvider.js";
import { fetchLegisPe } from "../backend/services/newsProviders/legisPeProvider.js";
import { fetchGacetaJuridica } from "../backend/services/newsProviders/gacetaJuridicaProvider.js";

// Nacionales
import { fetchPoderJudicial } from "../backend/services/newsProviders/poderJudicialProvider.js";
import { fetchTC } from "../backend/services/newsProviders/tcProvider.js";
import { fetchSUNARP } from "../backend/services/newsProviders/sunarpProvider.js";
import { fetchJNJ } from "../backend/services/newsProviders/jnjProvider.js";

// Internacionales
import { fetchOnuNoticias } from "../backend/services/newsProviders/onuProvider.js";
import { fetchCIJ } from "../backend/services/newsProviders/cijProvider.js";
import { fetchCorteIDH } from "../backend/services/newsProviders/corteIDHProvider.js";
import { fetchTJUE } from "../backend/services/newsProviders/tjueProvider.js";
import { fetchOEA } from "../backend/services/newsProviders/oeaProvider.js";

// Ciencia / ciber
import { fetchScienceNews } from "../backend/services/newsProviders/scienceProvider.js";
import { fetchCyberNews } from "../backend/services/newsProviders/cyberProvider.js";


async function runTests() {
  const tests = [
    { name: "GNews", fn: () => fetchGNews({ max: 5 }) },
    { name: "NewsAPI", fn: () => fetchNewsAPI({ max: 5 }) },
    { name: "Legis.pe", fn: () => fetchLegisPe({ max: 5 }) },
    { name: "Gaceta Jurídica", fn: () => fetchGacetaJuridica({ max: 5 }) },

    { name: "Poder Judicial", fn: () => fetchPoderJudicial({ max: 5 }) },
    { name: "TC", fn: () => fetchTC({ max: 5 }) },
    { name: "SUNARP", fn: () => fetchSUNARP({ max: 5 }) },
    { name: "JNJ", fn: () => fetchJNJ({ max: 5 }) },

    { name: "ONU", fn: () => fetchOnuNoticias({ max: 5 }) },
    { name: "CIJ", fn: () => fetchCIJ({ max: 5 }) },
    { name: "Corte IDH", fn: () => fetchCorteIDH({ max: 5 }) },
    { name: "TJUE", fn: () => fetchTJUE({ max: 5 }) },
    { name: "OEA", fn: () => fetchOEA({ max: 5 }) },

    { name: "Ciencia", fn: () => fetchScienceNews({ max: 5 }) },
    { name: "Ciberseguridad", fn: () => fetchCyberNews({ max: 5 }) },
  ];

  for (const { name, fn } of tests) {
    console.log("\n==============================");
    console.log(`📰 ${name}:`);
    try {
      const noticias = await fn();
      console.log(`${name}: ${noticias.length} noticias`);
      if (noticias.length > 0) {
        console.log("Ejemplo:", noticias[0]);
      }
    } catch (err) {
      console.error(`❌ Error en ${name}:`, err.message);
    }
  }
}

runTests().then(() => {
  console.log("\n✅ Prueba scraping finalizada.");
  process.exit(0);
});
