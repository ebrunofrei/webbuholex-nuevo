// backend/cron/cronNoticias.js
/**
 * ============================================================
 * 🦉 BÚHOLEX | Cron Automático de Noticias + Mantenimiento (Refactor)
 * ============================================================
 * - Actualiza noticias jurídicas y generales cada 3 horas.
 * - Clasifica/normaliza (título, resumen, contenido, imagen, tipo, especialidad).
 * - Mantenimiento nocturno (limpieza, reparación, reindexado, purga).
 * - Zona horaria: America/Lima
 * - Anti-solapamiento: evita corridas simultáneas.
 * ============================================================
 */

import 'dotenv/config';
import cron from 'node-cron';
import chalk from 'chalk';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, disconnectDB } from '../services/db.js';

// ===== Providers =====
// Generales
import fetchGNews from '../services/newsProviders/gnewsProvider.js';
import fetchNewsAPI from '../services/newsProviders/newsApiProvider.js';
import fetchScienceNews from '../services/newsProviders/scienceProvider.js';
import fetchCyberNews from '../services/newsProviders/cyberProvider.js';

// Jurídicas nacionales
import fetchLegisPe from '../services/newsProviders/legisPeProvider.js';
import fetchGacetaJuridica from '../services/newsProviders/gacetaJuridicaProvider.js';
import fetchPoderJudicial from '../services/newsProviders/poderJudicialProvider.js';
import fetchTC from '../services/newsProviders/tcProvider.js';
import fetchSUNARP from '../services/newsProviders/sunarpProvider.js';
import fetchJNJ from '../services/newsProviders/jnjProvider.js';

// Internacionales
import fetchOnuNoticias from '../services/newsProviders/onuProvider.js';
import fetchCIJ from '../services/newsProviders/cijProvider.js';
import fetchCorteIDH from '../services/newsProviders/corteIDHProvider.js';
import fetchTJUE from '../services/newsProviders/tjueProvider.js';
import fetchOEA from '../services/newsProviders/oeaProvider.js';

// ===== Servicios internos =====
import { upsertNoticias, limpiarDuplicados } from '../services/noticiasService.js';
import { normalizeNoticia, detectEspecialidad } from '../services/newsProviders/normalizer.js';

// ===== Mantenimiento adicional =====
import { repararEspecialidades } from '../scripts/fix-especialidades.js';
import { maintainIndexes } from '../../scripts/maintain-indexes.js';
import { limpiarNoticiasAntiguas } from '../../scripts/clean-news.js';

/* ---------------------------------------
 * Config
 * --------------------------------------- */
const TZ = 'America/Lima';
const EVERY_3_HOURS = '0 */3 * * *';        // minuto 0, cada 3 horas
const NIGHTLY_3AM   = '0 3 * * *';          // 03:00 a.m. Lima
const MAX_PER_SOURCE = Number(process.env.NEWS_MAX_PER_SOURCE || 20);
const CONCURRENCY = Number(process.env.NEWS_CONCURRENCY || 5);

const GNEWS_API_KEY = process.env.GNEWS_API_KEY || '';
const NEWSAPI_KEY   = process.env.NEWSAPI_KEY || '';

if (!process.env.NODE_ENV) {
  console.log(chalk.yellow('⚠️  NODE_ENV no definido. Usando variables por defecto.'));
}

/* ---------------------------------------
 * Estado anti-solapamiento (mutex simple)
 * --------------------------------------- */
let isIngestionRunning = false;
let isMaintenanceRunning = false;

/* ---------------------------------------
 * Util: trocear en lotes (concurrencia)
 * --------------------------------------- */
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/* ---------------------------------------
 * Wrapper de provider con tolerancia
 * --------------------------------------- */
async function safeFetch(label, fn, args = {}) {
  const t0 = Date.now();
  try {
    const arr = await fn(args);
    const list = Array.isArray(arr) ? arr : [];
    console.log(
      chalk.green(`✅ ${label} → ${list.length} resultados (${((Date.now() - t0) / 1000).toFixed(1)}s)`)
    );
    return list;
  } catch (err) {
    console.error(chalk.red(`❌ ${label} falló:`), err?.message || err);
    return [];
  }
}

/* ---------------------------------------
 * Ingesta principal (una sola pasada)
 * --------------------------------------- */
export async function runIngestionOnce() {
  if (isIngestionRunning) {
    console.log(chalk.yellow('⏳ runIngestionOnce ignorado: ya hay una ejecución en curso.'));
    return;
  }
  isIngestionRunning = true;
  const start = Date.now();

  console.log(chalk.cyan.bold('\n🕑 Ejecutando job de noticias (BúhoLex)...'));
  console.log(`🔑 GNEWS_API_KEY: ${GNEWS_API_KEY ? chalk.green('OK') : chalk.red('NO')}`);
  console.log(`🔑 NEWSAPI_KEY: ${NEWSAPI_KEY ? chalk.green('OK') : chalk.red('NO')}`);

  let connected = false;
  try {
    await connectDB();
    connected = true;

    // Providers activos (cada item: etiqueta, función, args)
    const providers = [
      // Jurídicas nacionales
      ['GNEWS (jurídica)', fetchGNews, { apiKey: GNEWS_API_KEY, tipo: 'juridica', max: MAX_PER_SOURCE }],
      ['Legis.pe',        fetchLegisPe,        { max: MAX_PER_SOURCE }],
      ['Gaceta Jurídica', fetchGacetaJuridica, { max: MAX_PER_SOURCE }],
      ['Poder Judicial',  fetchPoderJudicial,  { max: MAX_PER_SOURCE }],
      ['TC',              fetchTC,             { max: MAX_PER_SOURCE }],
      ['SUNARP',          fetchSUNARP,         { max: MAX_PER_SOURCE }],
      ['JNJ',             fetchJNJ,            { max: MAX_PER_SOURCE }],

      // Generales / Ciencia / Tech
      ['NewsAPI',         fetchNewsAPI,        { apiKey: NEWSAPI_KEY, max: MAX_PER_SOURCE }],
      ['ONU Noticias',    fetchOnuNoticias,    { max: MAX_PER_SOURCE }],
      ['Science',         fetchScienceNews,    { max: MAX_PER_SOURCE }],
      ['Cyber',           fetchCyberNews,      { max: MAX_PER_SOURCE }],

      // Internacionales
      ['CIJ',             fetchCIJ,            { max: MAX_PER_SOURCE }],
      ['Corte IDH',       fetchCorteIDH,       { max: MAX_PER_SOURCE }],
      ['TJUE',            fetchTJUE,           { max: MAX_PER_SOURCE }],
      ['OEA',             fetchOEA,            { max: MAX_PER_SOURCE }],
    ];

    // Ejecutar con concurrencia limitada
    let results = [];
    for (const lote of chunk(providers, CONCURRENCY)) {
      const settled = await Promise.all(
        lote.map(([label, fn, args]) => safeFetch(label, fn, args))
      );
      results.push(...settled.flat());
    }

    if (!results.length) {
      console.warn(chalk.yellow('⚠️ No se recibieron noticias válidas de los providers.'));
      return;
    }

    // Normalización + clasificación (especialidad/tipo)
    const normalized = results
      .map((n) =>
        normalizeNoticia({
          ...n,
          especialidad: detectEspecialidad(`${n.titulo} ${n.resumen} ${n.contenido || ''}`),
        })
      )
      .filter(
        (n) =>
          n.titulo?.length > 5 &&
          n.resumen?.length > 10 &&
          n.url?.length > 10
      );

    // Métricas
    const juridicas = normalized.filter((n) => n.tipo === 'juridica').length;
    const generales = normalized.length - juridicas;
    const descartadas = results.length - normalized.length;

    // Persistencia
    const { inserted, updated, skipped } = await upsertNoticias(normalized);

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(chalk.green('\n--------------------------------------------'));
    console.log(chalk.green.bold('📊 RESUMEN DE INGESTA DE NOTICIAS'));
    console.log(chalk.green('--------------------------------------------'));
    console.log(chalk.green(`⚖️ Jurídicas: ${juridicas}`));
    console.log(chalk.green(`🌐 Generales / Ciencia / Tecnología: ${generales}`));
    console.log(chalk.yellow(`🧩 Descartadas por contenido vacío: ${descartadas}`));
    console.log(chalk.green('--------------------------------------------'));
    console.log(chalk.green(`🆕 Nuevas: ${inserted}`));
    console.log(chalk.green(`♻️ Actualizadas: ${updated}`));
    console.log(chalk.yellow(`⏭️ Omitidas / duplicadas: ${skipped}`));
    console.log(chalk.cyan(`⏱️ Tiempo total: ${elapsed}s`));
    console.log(chalk.green('--------------------------------------------\n'));
  } catch (err) {
    console.error(chalk.red.bold('❌ Error fatal en runIngestionOnce:'), err?.message || err);
  } finally {
    if (connected) await disconnectDB();
    isIngestionRunning = false;
  }
}

/* ---------------------------------------
 * Programación (cada 3 horas)
 * --------------------------------------- */
export function jobNoticias() {
  cron.schedule(
    EVERY_3_HOURS,
    async () => {
      console.log(chalk.magenta.bold('\n🕒 [Cron] Iniciando ejecución automática de noticias...'));
      await runIngestionOnce();
    },
    { timezone: TZ }
  );
  console.log(chalk.blueBright(`⏱️ Job de noticias programado cada 3 horas (${TZ}).`));
}

/* ---------------------------------------
 * Mantenimiento nocturno (03:00 Lima)
 * --------------------------------------- */
cron.schedule(
  NIGHTLY_3AM,
  async () => {
    if (isMaintenanceRunning) {
      console.log(chalk.yellow('⏳ Mantenimiento ignorado: ya hay una ejecución en curso.'));
      return;
    }
    isMaintenanceRunning = true;

    console.log(chalk.magentaBright('\n🧹 [Cron] Mantenimiento nocturno iniciado...'));
    const start = Date.now();

    try {
      await connectDB();
      console.log(chalk.cyan('🔗 Conectado a MongoDB para mantenimiento.'));

      const eliminadas = await limpiarDuplicados();
      console.log(chalk.yellow(`🧽 Duplicados eliminados: ${eliminadas}`));

      await repararEspecialidades();

      await maintainIndexes();
      console.log(chalk.green('📚 Índices optimizados correctamente.'));

      await limpiarNoticiasAntiguas();
      console.log(chalk.cyan('🗑️ Noticias antiguas eliminadas correctamente.'));

      await runIngestionOnce();

      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(chalk.greenBright(`✅ Mantenimiento completado en ${elapsed}s.`));
    } catch (err) {
      console.error(chalk.red('❌ Error en mantenimiento nocturno:'), err?.message || err);
    } finally {
      await disconnectDB();
      console.log(chalk.gray('🔌 Conexión MongoDB cerrada.'));
      isMaintenanceRunning = false;
    }
  },
  { timezone: TZ }
);

/* ---------------------------------------
 * CLI / ejecución directa
 * --------------------------------------- */
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  console.log(chalk.gray('🧩 Ejecución manual de cronNoticias.js iniciada...'));
  runIngestionOnce()
    .then(() => {
      console.log(chalk.green('🏁 Finalizado correctamente.'));
      process.exit(0);
    })
    .catch((err) => {
      console.error(chalk.red('❌ Error fatal en ejecución manual:'), err);
      process.exit(1);
    });
}
