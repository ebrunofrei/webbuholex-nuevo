// ============================================================
// 🦉 BÚHOLEX | TEST INTEGRADO DE SCRAPING + MONGODB
// ============================================================
// Este script conecta a MongoDB, ejecuta todos los scrapers activos
// y guarda automáticamente las noticias en la colección "noticias".
// Muestra un resumen de inserciones, actualizaciones y tiempo total.
// ============================================================

import { performance } from "perf_hooks";
import chalk from "chalk";
import { connectDB, disconnectDB } from "../backend/services/db.js";
import { obtenerNoticiasDeFuentes } from "../backend/services/noticiasScraperService.js";
import { Noticia } from "../backend/models/Noticia.js";

// ============================================================
// 🔧 Configuración
// ============================================================

const BATCH_SIZE = 100; // número máximo de noticias a insertar por lote

// ============================================================
// 🧩 Función de guardado optimizado
// ============================================================

async function saveNoticiasBatch(noticias) {
  const ops = [];
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const n of noticias) {
    if (!n.titulo || !n.url) {
      skipped++;
      continue;
    }

    ops.push({
      updateOne: {
        filter: { enlace: n.url },
        update: {
          $setOnInsert: { createdAt: new Date() },
          $set: {
            titulo: n.titulo,
            resumen: n.resumen,
            contenido: n.contenido || "",
            fuente: n.fuente,
            url: n.url,
            imagen: n.imagen,
            tipo: n.tipo,
            especialidad: n.especialidad,
            fecha: n.fecha || new Date(),
            updatedAt: new Date(),
          },
        },
        upsert: true,
      },
    });
  }

  if (ops.length === 0) return { inserted, updated, skipped };

  const bulk = await Noticia.bulkWrite(ops, { ordered: false });

  inserted = bulk.upsertedCount || 0;
  updated = bulk.modifiedCount || 0;

  return { inserted, updated, skipped };
}

// ============================================================
// 🧠 Función principal
// ============================================================

async function main() {
  console.log(chalk.blue("\n=========================================="));
  console.log(chalk.blue("🦉 TEST INTEGRADO SCRAPING + MONGODB"));
  console.log(chalk.blue("==========================================\n"));

  const start = performance.now();

  await connectDB();

  try {
    console.log(chalk.yellow("📡 Iniciando scraping de todas las fuentes...\n"));
    const noticias = await obtenerNoticiasDeFuentes();

    console.log(chalk.cyan(`🧩 Total noticias extraídas: ${noticias.length}`));

    const resumen = await saveNoticiasBatch(noticias);

    console.log(chalk.green("\n------------------------------------------"));
    console.log(chalk.green("📊 RESUMEN DE GUARDADO EN MONGODB"));
    console.log(chalk.green("------------------------------------------"));
    console.log(chalk.green(`🆕 Insertadas nuevas: ${resumen.inserted}`));
    console.log(chalk.green(`♻️  Actualizadas existentes: ${resumen.updated}`));
    console.log(chalk.yellow(`⏭️  Omitidas por error o duplicado: ${resumen.skipped}`));
    console.log(chalk.green("------------------------------------------"));

  } catch (err) {
    console.error(chalk.red("❌ Error general en test-news-db:"), err.message);
  } finally {
    await disconnectDB();
    const end = performance.now();
    console.log(chalk.blue(`\n⏱️  Tiempo total: ${((end - start) / 1000).toFixed(2)}s`));
    console.log(chalk.blue("✅ Test finalizado correctamente.\n"));
    process.exit(0);
  }
}

// 🚀 Ejecutar
main();
