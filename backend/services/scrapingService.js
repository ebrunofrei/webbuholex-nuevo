// ============================================================
// 🦉 BÚHOLEX | Servicio principal de scraping de noticias
// ============================================================

import {
  fetchPoderJudicial,
  fetchTC,
  fetchSUNARP,
  fetchJNJ,
  fetchGacetaJuridica,
  fetchLegisPe,
  fetchCorteIDH,
  fetchCIJ,
  fetchTJUE,
  fetchOEA,
  fetchOnuNoticias,
  fetchScienceNews,
  fetchCyberNews,
  fetchGNews,
  fetchNewsAPI,
} from "./newsProviders/index.js";

import { normalizeNoticias } from "./newsProviders/normalizer.js";
import chalk from "chalk";

// ============================================================
// 🔹 Ejecuta todos los scrapers y unifica los resultados
// ============================================================

export async function obtenerNoticiasDeFuentes() {
  console.log(chalk.blue("🧠 Iniciando scraping global de fuentes jurídicas e informativas..."));

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

  const resultados = [];

  for (const fuente of fuentes) {
    console.log(chalk.yellow(`\n📰 Extrayendo desde: ${fuente.nombre} ...`));

    try {
      const data = await fuente.fn({ max: 10 });
      if (Array.isArray(data) && data.length > 0) {
        console.log(chalk.green(`✅ ${fuente.nombre} devolvió ${data.length} resultados.`));
        resultados.push(...data);
      } else {
        console.log(chalk.red(`⚠️ ${fuente.nombre} no devolvió resultados.`));
      }
    } catch (err) {
      console.error(chalk.red(`❌ Error en ${fuente.nombre}: ${err.message}`));
    }
  }

  // 🔄 Normalizar y deduplicar
  const noticiasNormalizadas = normalizeNoticias(resultados);
  const unicas = noticiasNormalizadas.filter(
    (v, i, a) => a.findIndex((t) => t.url === v.url) === i
  );

  console.log(chalk.cyan("\n------------------------------------------"));
  console.log(chalk.cyan("📊 Totales consolidados"));
  console.log(chalk.cyan("------------------------------------------"));
  console.log(chalk.cyan(`⚖️  Jurídicas: ${unicas.filter((n) => n.tipo === "juridica").length}`));
  console.log(chalk.cyan(`🌐 Generales / Ciencia / Tecnología: ${unicas.filter((n) => n.tipo === "general").length}`));
  console.log(chalk.cyan("------------------------------------------\n"));

  return unicas;
}
