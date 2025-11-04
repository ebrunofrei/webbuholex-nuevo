// ============================================================
// 🦉 BÚHOLEX | Script de Limpieza de Noticias Antiguas
// ============================================================
// Elimina automáticamente las noticias más antiguas que el
// período configurado (por defecto: 45 días).
// Diseñado para integrarse con cronNoticias.js o ejecutarse
// manualmente sin afectar las noticias recientes.
// ============================================================

import mongoose from "mongoose";
import dotenv from "dotenv";
import chalk from "chalk";
import { Noticia } from "../backend/models/Noticia.js";

// Carga entorno de desarrollo o producción automáticamente
dotenv.config({ path: ".env.development" });

// ============================================================
// ⚙️ Configuración del periodo de retención
// ============================================================
// Puedes cambiar esta constante o leerla de una variable de entorno.
const RETENCION_DIAS = Number(process.env.NEWS_RETENTION_DAYS || 45);

// ============================================================
// 🧩 Función principal exportable
// ============================================================
export async function limpiarNoticiasAntiguas() {
  try {
    console.log(chalk.cyan(`\n🧹 Iniciando limpieza de noticias antiguas (>${RETENCION_DIAS} días)...`));
    await mongoose.connect(process.env.MONGO_URI);
    console.log(chalk.green("✅ Conectado correctamente a MongoDB."));

    // Calcular fecha límite
    const limite = new Date();
    limite.setDate(limite.getDate() - RETENCION_DIAS);

    // Contar y eliminar
    const total = await Noticia.countDocuments({ fecha: { $lt: limite } });
    if (total === 0) {
      console.log(chalk.greenBright("🟢 No hay noticias antiguas para eliminar."));
    } else {
      const result = await Noticia.deleteMany({ fecha: { $lt: limite } });
      console.log(chalk.yellow(`🧽 Noticias eliminadas: ${result.deletedCount || total}`));
    }

    await mongoose.disconnect();
    console.log(chalk.gray("🔌 Conexión MongoDB cerrada."));
  } catch (err) {
    console.error(chalk.red("❌ Error al limpiar noticias antiguas:"), err.message);
  }
}

// ============================================================
// 🧰 Ejecución manual directa
// ============================================================
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(chalk.gray("🧩 Ejecución manual de clean-news.js iniciada..."));
  limpiarNoticiasAntiguas()
    .then(() => {
      console.log(chalk.green("🏁 Limpieza completada correctamente."));
      process.exit(0);
    })
    .catch((err) => {
      console.error(chalk.red("❌ Error fatal en ejecución manual:"), err);
      process.exit(1);
    });
}
