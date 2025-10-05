// ============================================================
// 🦉 BÚHOLEX | JOB DE GUARDADO DE NOTICIAS
// ============================================================
// Centraliza la lógica de scraping + normalización + guardado
// ============================================================

import { connectDB, disconnectDB } from "../services/db.js";
import { obtenerNoticiasDeFuentes } from "../services/noticiasScraperService.js";
import { Noticia } from "../models/Noticia.js";
import chalk from "chalk";

export async function guardarNoticias() {
  console.log(chalk.blue("\n=========================================="));
  console.log(chalk.blue("🦉 JOB AUTOMÁTICO DE NOTICIAS BÚHOLEX"));
  console.log(chalk.blue("==========================================\n"));

  await connectDB();

  try {
    console.log(chalk.yellow("📡 Iniciando scraping desde múltiples fuentes...\n"));
    const noticias = await obtenerNoticiasDeFuentes();
    console.log(chalk.cyan(`🧩 Total noticias obtenidas: ${noticias.length}`));

    if (!noticias || noticias.length === 0) {
      console.log(chalk.red("⚠️ No se encontraron noticias nuevas."));
      return;
    }

    const ops = noticias.map((n) => ({
      updateOne: {
        filter: { url: n.url },
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
    }));

    const result = await Noticia.bulkWrite(ops, { ordered: false });
    const inserted = result.upsertedCount || 0;
    const updated = result.modifiedCount || 0;

    console.log(chalk.green("\n------------------------------------------"));
    console.log(chalk.green("📊 RESULTADO DE GUARDADO EN MONGODB"));
    console.log(chalk.green("------------------------------------------"));
    console.log(chalk.green(`🆕 Nuevas insertadas: ${inserted}`));
    console.log(chalk.green(`♻️  Actualizadas existentes: ${updated}`));
    console.log(chalk.green("------------------------------------------"));
  } catch (err) {
    console.error(chalk.red("❌ Error en guardarNoticias:"), err.message);
  } finally {
    await disconnectDB();
    console.log(chalk.blue("\n✅ Finalizado guardado automático.\n"));
  }
}
