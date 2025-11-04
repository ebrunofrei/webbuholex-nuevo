// ============================================================
// 🦉 BÚHOLEX | Script de Mantenimiento de Índices MongoDB
// ============================================================
// Asegura la existencia y eficiencia de los índices principales
// usados por el sistema de noticias BúhoLex.
//
// Índices esenciales:
//   - url (único)
//   - tipo
//   - especialidad
//   - fecha (para ordenamiento rápido)
// ============================================================

import mongoose from "mongoose";
import chalk from "chalk";
import dotenv from "dotenv";
import { Noticia } from "../backend/models/Noticia.js";

// Cargar entorno adecuado
dotenv.config({ path: ".env.development" });

export async function maintainIndexes() {
  try {
    console.log(chalk.cyan("\n🔍 Iniciando mantenimiento de índices en colección 'noticias'..."));
    await mongoose.connect(process.env.MONGO_URI);

    const model = mongoose.model("Noticia");
    const indexes = await model.listIndexes();

    const existentes = indexes.map((i) => Object.keys(i.key)[0]);
    console.log(chalk.gray(`📋 Índices existentes: ${existentes.join(", ")}`));

    const requeridos = [
      { key: { url: 1 }, unique: true },
      { key: { tipo: 1 } },
      { key: { especialidad: 1 } },
      { key: { fecha: -1 } },
    ];

    let creados = 0;
    for (const idx of requeridos) {
      const campo = Object.keys(idx.key)[0];
      if (!existentes.includes(campo)) {
        await model.collection.createIndex(idx.key, idx);
        console.log(chalk.green(`✅ Índice creado: ${campo}`));
        creados++;
      }
    }

    if (creados === 0) {
      console.log(chalk.greenBright("🟢 Todos los índices necesarios ya existen."));
    }

    console.log(chalk.cyan("📚 Verificación final de índices completada."));
    await mongoose.disconnect();
    console.log(chalk.gray("🔌 Conexión MongoDB cerrada tras mantenimiento."));
  } catch (err) {
    console.error(chalk.red("❌ Error durante el mantenimiento de índices:"), err.message);
  }
}

// ============================================================
// 🧰 Ejecución manual directa
// ============================================================
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(chalk.gray("🧩 Ejecución manual de maintain-indexes.js iniciada..."));
  maintainIndexes()
    .then(() => {
      console.log(chalk.green("🏁 Mantenimiento de índices completado correctamente."));
      process.exit(0);
    })
    .catch((err) => {
      console.error(chalk.red("❌ Error fatal:"), err);
      process.exit(1);
    });
}
