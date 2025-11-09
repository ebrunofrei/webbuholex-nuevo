// ============================================================
// 🦉 BÚHOLEX | Script de prueba de proveedores de noticias
// ============================================================
// Permite verificar cuántas noticias devuelve cada provider
// antes de ejecutarlo en el cron o el job automático.
// ============================================================

import { performance } from "perf_hooks";
import chalk from "chalk";

// 🧩 Importar providers
import { fetchPoderJudicial } from "../backend/services/newsProviders/poderJudicialProvider.js";
import { fetchTC } from "../backend/services/newsProviders/tcProvider.js";
import { fetchSUNARP } from "../backend/services/newsProviders/sunarpProvider.js";
import { fetchJNJ } from "../backend/services/newsProviders/jnjProvider.js";
import { fetchGacetaJuridica } from "../backend/services/newsProviders/gacetaJuridicaProvider.js";
import { fetchLegisPe } from "../backend/services/newsProviders/legisPeProvider.js";
import { fetchCorteIDH } from "../backend/services/newsProviders/corteIDHProvider.js";
import { fetchCIJ } from "../backend/services/newsProviders/cijProvider.js";
import { fetchTJUE } from "../backend/services/newsProviders/tjueProvider.js";
import { fetchOEA } from "../backend/services/newsProviders/oeaProvider.js";
import { fetchOnuNoticias } from "../backend/services/newsProviders/onuProvider.js";
import { fetchScienceNews } from "../backend/services/newsProviders/scienceProvider.js";
import { fetchCyberNews } from "../backend/services/newsProviders/cyberProvider.js";
import { fetchGNews } from "../backend/services/newsProviders/gnewsProvider.js";
import { fetchNewsAPI } from "../backend/services/newsProviders/newsApiProvider.js";

const GNEWS_API_KEY = process.env.GNEWS_API_KEY || "";
const NEWSAPI_KEY = process.env.NEWSAPI_KEY || "";

// ============================================================
// 🔹 Lista de pruebas
// ============================================================
const fuentes = [
  { nombre: "Poder Judicial", fn: fetchPoderJudicial },
  { nombre: "Tribunal Constitucional", fn: fetchTC },
  { nombre: "SUNARP", fn: fetchSUNARP },
  { nombre: "JNJ", fn: fetchJNJ },
  { nombre: "Gaceta Jurídica", fn: fetchGacetaJuridica },
  { nombre: "Legis.pe", fn: fetchLegisPe },
  { nombre: "Corte IDH", fn: fetchCorteIDH },
  { nombre: "CIJ", fn: fetchCIJ },
  { nombre: "TJUE", fn: fetchTJUE },
  { nombre: "OEA", fn: fetchOEA },
  { nombre: "ONU Noticias", fn: fetchOnuNoticias },
  { nombre: "MIT Science", fn: fetchScienceNews },
  { nombre: "WeLiveSecurity", fn: fetchCyberNews },
];

if (GNEWS_API_KEY) fuentes.push({ nombre: "GNews", fn: () => fetchGNews({ apiKey: GNEWS_API_KEY }) });
if (NEWSAPI_KEY) fuentes.push({ nombre: "NewsAPI", fn: () => fetchNewsAPI({ apiKey: NEWSAPI_KEY }) });

// ============================================================
// 🧠 Función principal
// ============================================================
async function probarProviders() {
  console.log(chalk.blue("\n============================"));
  console.log(chalk.blue("🦉 PRUEBA DE PROVIDERS BÚHOLEX"));
  console.log(chalk.blue("============================\n"));

  const inicio = performance.now();

  for (const fuente of fuentes) {
    const t0 = performance.now();
    console.log(chalk.yellow(`🔍 Probando ${fuente.nombre} ...`));

    try {
      const data = await fuente.fn({ max: 10 });
      const tiempo = ((performance.now() - t0) / 1000).toFixed(2);
      const cantidad = data?.length || 0;

      if (cantidad > 0) {
        console.log(chalk.green(`   ✅ ${cantidad} noticias encontradas en ${tiempo}s`));
        const ejemplo = data[0];
        console.log(`   📰 Ejemplo: ${chalk.white(ejemplo.titulo?.slice(0, 100))}`);
        console.log(`   🌐 Fuente: ${chalk.gray(ejemplo.fuente)}\n`);
      } else {
        console.log(chalk.red(`   ⚠️ Sin resultados (${tiempo}s)\n`));
      }
    } catch (err) {
      console.log(chalk.red(`   ❌ Error en ${fuente.nombre}: ${err.message}\n`));
    }
  }

  const fin = performance.now();
  console.log(chalk.blue("----------------------------------------------------"));
  console.log(chalk.blue(`🧩 Finalizado en ${(fin - inicio) / 1000} segundos totales`));
  console.log(chalk.blue("----------------------------------------------------\n"));
}

// 🚀 Ejecutar
probarProviders();
