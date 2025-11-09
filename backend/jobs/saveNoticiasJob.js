// backend/jobs/saveNoticiasJob.js
// ============================================================
// 🦉 BÚHOLEX | Guardado manual de noticias (wrapper unificado)
// - Reusa el agregador de providers y el normalizador PRO
// - Graba por clave única: { enlace }  (NO url)
// ============================================================

import chalk from "chalk";
import { connectDB, disconnectDB } from "../services/db.js";
import { collectFromProviders } from "../services/newsProviders/index.js"; // ← agregador unificado
import { normalizeNoticia, detectEspecialidad } from "../services/newsProviders/normalizer.js";
import { upsertNoticias } from "../services/noticiasService.js"; // ← mismo que usa el cron

export async function guardarNoticias({
  tipo = "juridica",         // por defecto, jurídicas
  providers = [],            // si vacío, usa DEFAULT_JURIDICAS/DEFAULT_GENERALES
  q = "", lang = "es",
  completos = false,
  page = 1, limit = 50,
} = {}) {
  console.log(chalk.blue("\n=========================================="));
  console.log(chalk.blue("🦉 GUARDADO MANUAL DE NOTICIAS (BÚHOLEX)"));
  console.log(chalk.blue("==========================================\n"));

  await connectDB();
  try {
    console.log(chalk.yellow("📡 Consultando providers...\n"));

    // 1) Trae noticias desde el agregador (sincronizado con el cron)
    const { items } = await collectFromProviders({
      tipo, providers, q, lang, completos, page, limit,
    });

    if (!items?.length) {
      console.log(chalk.red("⚠️ No se obtuvieron noticias."));
      return { inserted: 0, updated: 0, skipped: 0 };
    }

    // 2) Normaliza + clasifica (usa el mismo normalizador PRO)
    const normalized = items
      .map((n) =>
        normalizeNoticia({
          ...n,
          especialidad: detectEspecialidad(`${n.titulo} ${n.resumen} ${n.contenido || ""}`),
        })
      )
      // filtro mínimo de calidad
      .filter(
        (n) =>
          n.titulo?.length > 5 &&
          n.resumen?.length > 10 &&
          (n.url?.length > 10 || n.enlace?.length > 10)
      )
      // asegurar que “enlace” exista (el modelo lo necesita)
      .map((n) => ({
        ...n,
        enlace: n.enlace || n.url,   // 👈 clave correcta para el modelo
      }));

    // 3) Upsert en Mongo (misma función del cron)
    const { inserted, updated, skipped } = await upsertNoticias(normalized);

    console.log(chalk.green("\n------------------------------------------"));
    console.log(chalk.green("📊 RESULTADO DE GUARDADO EN MONGODB"));
    console.log(chalk.green("------------------------------------------"));
    console.log(chalk.green(`🆕 Nuevas insertadas: ${inserted}`));
    console.log(chalk.green(`♻️  Actualizadas:     ${updated}`));
    console.log(chalk.yellow(`⏭️ Omitidas/dup.:     ${skipped}`));
    console.log(chalk.green("------------------------------------------\n"));

    return { inserted, updated, skipped };
  } catch (err) {
    console.error(chalk.red("❌ Error en guardarNoticias:"), err?.message || err);
    throw err;
  } finally {
    await disconnectDB();
    console.log(chalk.blue("✅ Finalizado guardado manual.\n"));
  }
}
