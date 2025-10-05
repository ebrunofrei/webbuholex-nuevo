/**
 * ============================================================
 * 🦉 BÚHOLEX | Cron Automático de Noticias + Mantenimiento
 * ============================================================
 * - Actualiza noticias jurídicas y generales cada 3 horas.
 * - Clasifica y normaliza automáticamente (título, resumen, contenido, imagen, tipo, especialidad).
 * - Ejecuta mantenimiento nocturno (limpieza, reparación, reindexado, purga).
 * ============================================================
 */

import dotenv from "dotenv";
import path from "path";
import cron from "node-cron";
import chalk from "chalk";
import { connectDB, disconnectDB } from "../services/db.js";

// ===== Providers =====
// Generales
import { fetchGNews } from "../services/newsProviders/gnewsProvider.js";
import { fetchNewsAPI } from "../services/newsProviders/newsApiProvider.js";
import { fetchScienceNews } from "../services/newsProviders/scienceProvider.js";
import { fetchCyberNews } from "../services/newsProviders/cyberProvider.js";

// Jurídicas nacionales
import { fetchLegisPe } from "../services/newsProviders/legisPeProvider.js";
import { fetchGacetaJuridica } from "../services/newsProviders/gacetaJuridicaProvider.js";
import { fetchPoderJudicial } from "../services/newsProviders/poderJudicialProvider.js";
import { fetchTC } from "../services/newsProviders/tcProvider.js";
import { fetchSUNARP } from "../services/newsProviders/sunarpProvider.js";
import { fetchJNJ } from "../services/newsProviders/jnjProvider.js";

// Internacionales
import { fetchOnuNoticias } from "../services/newsProviders/onuProvider.js";
import { fetchCIJ } from "../services/newsProviders/cijProvider.js";
import { fetchCorteIDH } from "../services/newsProviders/corteIDHProvider.js";
import { fetchTJUE } from "../services/newsProviders/tjueProvider.js";
import { fetchOEA } from "../services/newsProviders/oeaProvider.js";

// ===== Servicios internos =====
import { upsertNoticias, limpiarDuplicados } from "../services/noticiasService.js";
import { normalizeNoticia, detectEspecialidad } from "../services/newsProviders/normalizer.js";

// ===== Mantenimiento adicional =====
import { repararEspecialidades } from "../../scripts/fix-especialidades.js";
import { maintainIndexes } from "../../scripts/maintain-indexes.js";
import { limpiarNoticiasAntiguas } from "../../scripts/clean-news.js";

// ===== Configuración dinámica =====
const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env.development";
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

// ============================================================
// ⏱️ Ejecución cada 3 horas
// ============================================================
const EVERY_3_HOURS = "0 */3 * * *";

/**
 * 🧩 Ejecución principal de ingesta de noticias
 */
async function runIngestionOnce() {
  const apiKey = process.env.GNEWS_API_KEY || "";
  const fallbackKey = process.env.NEWSAPI_KEY || "";
  const MAX = Number(process.env.NEWS_MAX_PER_SOURCE || 20);

  console.log(chalk.cyan.bold("\n🕑 Ejecutando job de noticias (BúhoLex)..."));
  console.log(`🔑 GNEWS_API_KEY: ${apiKey ? chalk.green("OK") : chalk.red("NO CONFIGURADO")}`);
  console.log(`🔑 NEWSAPI_KEY: ${fallbackKey ? chalk.green("OK") : chalk.red("NO CONFIGURADO")}`);

  let isConnected = false;
  const start = Date.now();

  try {
    await connectDB();
    isConnected = true;

    // ====== Descarga paralela de fuentes ======
    const results = await Promise.allSettled([
      // Jurídicas nacionales
      fetchGNews({ apiKey, tipo: "juridica", max: MAX }),
      fetchLegisPe({ max: MAX }),
      fetchGacetaJuridica({ max: MAX }),
      fetchPoderJudicial({ max: MAX }),
      fetchTC({ max: MAX }),
      fetchSUNARP({ max: MAX }),
      fetchJNJ({ max: MAX }),

      // Generales y tecnología
      fetchNewsAPI({ apiKey: fallbackKey, max: MAX }),
      fetchOnuNoticias({ max: MAX }),
      fetchScienceNews({ max: MAX }),
      fetchCyberNews({ max: MAX }),

      // Internacionales
      fetchCIJ({ max: MAX }),
      fetchCorteIDH({ max: MAX }),
      fetchTJUE({ max: MAX }),
      fetchOEA({ max: MAX }),
    ]);

    // ====== Filtrar y unir resultados ======
    const data = results
      .filter((r) => r.status === "fulfilled" && Array.isArray(r.value))
      .flatMap((r) => r.value);

    if (!data.length) {
      console.warn(chalk.yellow("⚠️ No se recibieron noticias válidas de los providers."));
      return;
    }

    // ====== Normalizar ======
    const normalized = data
      .map((n) =>
        normalizeNoticia({
          ...n,
          especialidad: detectEspecialidad(`${n.titulo} ${n.resumen} ${n.contenido}`),
        })
      )
      .filter(
        (n) =>
          n.titulo &&
          n.titulo.length > 5 &&
          n.resumen &&
          n.resumen.length > 10 &&
          n.url &&
          n.url.length > 10
      );

    // ====== Métricas ======
    const juridicas = normalized.filter((n) => n.tipo === "juridica").length;
    const generales = normalized.length - juridicas;
    const sinContenido = data.length - normalized.length;

    // ====== Guardar en Mongo ======
    const { inserted, updated, skipped } = await upsertNoticias(normalized);

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    console.log(chalk.green("\n--------------------------------------------"));
    console.log(chalk.green.bold("📊 RESUMEN DE INGESTA DE NOTICIAS"));
    console.log(chalk.green("--------------------------------------------"));
    console.log(chalk.green(`⚖️ Jurídicas: ${juridicas}`));
    console.log(chalk.green(`🌐 Generales / Ciencia / Tecnología: ${generales}`));
    console.log(chalk.yellow(`🧩 Noticias descartadas por contenido vacío: ${sinContenido}`));
    console.log(chalk.green("--------------------------------------------"));
    console.log(chalk.green(`🆕 Nuevas: ${inserted}`));
    console.log(chalk.green(`♻️ Actualizadas: ${updated}`));
    console.log(chalk.yellow(`⏭️ Omitidas / duplicadas: ${skipped}`));
    console.log(chalk.cyan(`⏱️ Tiempo total: ${elapsed}s`));
    console.log(chalk.green("--------------------------------------------\n"));
  } catch (err) {
    console.error(chalk.red.bold("❌ Error fatal en runIngestionOnce:"), err.message);
  } finally {
    if (isConnected) await disconnectDB();
  }
}

/**
 * 🕒 Programa ejecución automática cada 3 horas
 */
export function jobNoticias() {
  cron.schedule(EVERY_3_HOURS, async () => {
    console.log(chalk.magenta.bold("\n🕒 [Cron] Iniciando ejecución automática de noticias..."));
    await runIngestionOnce();
  });

  console.log(chalk.blueBright("⏱️ Job de noticias programado cada 3 horas."));
}

/**
 * 🧰 Permite ejecución manual (Railway, Vercel CLI, etc.)
 */
export async function jobNoticiasOnce() {
  return runIngestionOnce();
}

/**
 * ============================================================
 * 🕒 Mantenimiento nocturno automático (03:00 a.m. cada día)
 * ============================================================
 * - Limpia duplicados
 * - Repara especialidades
 * - Reindexa índices
 * - Purga noticias antiguas (>45 días)
 * - Ejecuta la ingesta principal de noticias
 * ============================================================
 */
cron.schedule("0 3 * * *", async () => {
  console.log(chalk.magentaBright("\n🧹 [Cron] Mantenimiento nocturno iniciado..."));
  const start = Date.now();

  try {
    await connectDB();
    console.log(chalk.cyan("🔗 Conectado a MongoDB para mantenimiento."));

    // 1️⃣ Limpiar duplicados
    const eliminadas = await limpiarDuplicados();
    console.log(chalk.yellow(`🧽 Duplicados eliminados: ${eliminadas}`));

    // 2️⃣ Reparar especialidades
    await repararEspecialidades();

    // 3️⃣ Reindexar
    await maintainIndexes();
    console.log(chalk.green("📚 Índices optimizados correctamente."));

    // 4️⃣ Limpiar noticias antiguas
    await limpiarNoticiasAntiguas();
    console.log(chalk.cyan("🗑️ Noticias antiguas eliminadas correctamente."));

    // 5️⃣ Ejecutar ingesta de noticias
    await runIngestionOnce();

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(chalk.greenBright(`✅ Mantenimiento completado en ${elapsed}s.`));
  } catch (err) {
    console.error(chalk.red("❌ Error en mantenimiento nocturno:"), err.message);
  } finally {
    await disconnectDB();
    console.log(chalk.gray("🔌 Conexión MongoDB cerrada."));
  }
});

/**
 * ============================================================
 * 🧩 Ejecución directa desde consola
 * ============================================================
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(chalk.gray("🧩 Ejecución manual de cronNoticias.js iniciada..."));
  runIngestionOnce()
    .then(() => {
      console.log(chalk.green("🏁 Finalizado correctamente."));
      process.exit(0);
    })
    .catch((err) => {
      console.error(chalk.red("❌ Error fatal en ejecución manual:"), err);
      process.exit(1);
    });
}
