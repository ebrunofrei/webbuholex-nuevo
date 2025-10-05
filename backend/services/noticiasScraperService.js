// ============================================================
// 🦉 BÚHOLEX | Servicio unificado de scraping de noticias
// ============================================================
// Este módulo centraliza todas las fuentes definidas en
// backend/services/newsProviders/*.js
// Cada provider devuelve un array de noticias estandarizadas.
// ============================================================

import { fetchPoderJudicial as fetchNoticiasPJ } from "./newsProviders/poderJudicialProvider.js";
import { fetchTC as fetchNoticiasTC } from "./newsProviders/tcProvider.js";
import { fetchSUNARP } from "./newsProviders/sunarpProvider.js";
import { fetchJNJ } from "./newsProviders/jnjProvider.js";
import { fetchLegisPe } from "./newsProviders/legisPeProvider.js";
import { fetchGacetaJuridica } from "./newsProviders/gacetaJuridicaProvider.js";
import { fetchCorteIDH } from "./newsProviders/corteIDHProvider.js";
import { fetchCIJ } from "./newsProviders/cijProvider.js";
import { fetchTJUE } from "./newsProviders/tjueProvider.js";
import { fetchOEA } from "./newsProviders/oeaProvider.js";
import { fetchOnuNoticias } from "./newsProviders/onuProvider.js";
import { fetchScienceNews } from "./newsProviders/scienceProvider.js";
import { fetchCyberNews } from "./newsProviders/cyberProvider.js";
import { fetchGNews } from "./newsProviders/gnewsProvider.js";
import { fetchNewsAPI } from "./newsProviders/newsApiProvider.js";
import { normalizeNoticias } from "./newsProviders/normalizer.js";

// ============================================================
// ⚙️ Config general
// ============================================================
const GNEWS_API_KEY = process.env.GNEWS_API_KEY || "";
const NEWSAPI_KEY = process.env.NEWSAPI_KEY || "";

/**
 * Ejecuta todos los scrapers activos y unifica los resultados
 * con manejo seguro de errores y deduplicación.
 * @returns {Promise<Array>} Lista completa de noticias normalizadas.
 */
export async function obtenerNoticiasDeFuentes() {
  console.log("\n📡 Iniciando scraping global de fuentes jurídicas e informativas...");

  // 1️⃣ Lista de scrapers activos (jurídicos + temáticos)
  const fuentes = [
    // Jurídicas nacionales
    { nombre: "Poder Judicial", fn: fetchNoticiasPJ },
    { nombre: "Tribunal Constitucional", fn: fetchNoticiasTC },
    { nombre: "SUNARP", fn: fetchSUNARP },
    { nombre: "JNJ", fn: fetchJNJ },
    { nombre: "Gaceta Jurídica", fn: fetchGacetaJuridica },
    { nombre: "Legis.pe", fn: fetchLegisPe },

    // Internacionales
    { nombre: "Corte IDH", fn: fetchCorteIDH },
    { nombre: "Corte Internacional de Justicia", fn: fetchCIJ },
    { nombre: "Tribunal de Justicia de la UE", fn: fetchTJUE },
    { nombre: "OEA", fn: fetchOEA },
    { nombre: "ONU Noticias", fn: fetchOnuNoticias },

    // Ciencia, tecnología y ciberseguridad
    { nombre: "MIT Science", fn: fetchScienceNews },
    { nombre: "WeLiveSecurity (ESET)", fn: fetchCyberNews },
  ];

  // 🌐 Fuentes generales de respaldo (con APIs)
  if (GNEWS_API_KEY) fuentes.push({ nombre: "GNews", fn: () => fetchGNews({ apiKey: GNEWS_API_KEY }) });
  if (NEWSAPI_KEY) fuentes.push({ nombre: "NewsAPI", fn: () => fetchNewsAPI({ apiKey: NEWSAPI_KEY }) });

  const resultados = [];

  // 2️⃣ Ejecutar cada fuente de manera independiente
  for (const fuente of fuentes) {
    try {
      console.log(`🔍 Extrayendo desde: ${fuente.nombre} ...`);
      const data = await fuente.fn({ max: 15 });
      if (Array.isArray(data) && data.length) {
        resultados.push(...data);
        console.log(`   ✅ ${data.length} noticias obtenidas de ${fuente.nombre}`);
      } else {
        console.warn(`   ⚠️ ${fuente.nombre} no devolvió resultados.`);
      }
    } catch (error) {
      console.error(`   ❌ Error en ${fuente.nombre}:`, error.message);
    }
  }

  // 3️⃣ Normalización y limpieza
  console.log("🧩 Normalizando datos...");
  const normalizadas = normalizeNoticias(resultados);

  // 4️⃣ Deduplicar por título o URL
  const unicas = [];
  const titulosVistos = new Set();

  for (const n of normalizadas) {
    const clave = (n.titulo + n.url).trim().toLowerCase();
    if (!titulosVistos.has(clave)) {
      unicas.push(n);
      titulosVistos.add(clave);
    }
  }

  // 5️⃣ Resumen de ejecución
  const juridicas = unicas.filter((n) => n.tipo === "juridica");
  const generales = unicas.filter((n) => n.tipo === "general");

  console.log("------------------------------------------------------");
  console.log(`📦 Total consolidadas: ${unicas.length}`);
  console.log(`⚖️  Jurídicas: ${juridicas.length}`);
  console.log(`🌎 Generales / Ciencia / Tecnología: ${generales.length}`);
  console.log("------------------------------------------------------\n");

  return unicas;
}
