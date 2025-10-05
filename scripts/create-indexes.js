/**
 * 🧠 create-indexes.js
 * Crea índices optimizados para la colección "noticias"
 * Autor: BúhoLex LegalTech
 */

import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";
import chalk from "chalk";

const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env.development";
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_URL_LOCAL;

async function createIndexes() {
  console.log(chalk.cyan("\n⚙️ Creando índices optimizados para la colección 'noticias'..."));

  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 30000,
    });

    const db = mongoose.connection.db;
    const collection = db.collection("noticias");

    const desiredIndexes = [
      { key: { tipo: 1, especialidad: 1, fecha: -1 }, name: "tipo_especialidad_fecha" },
    ];

    const textIndex = {
      key: { titulo: "text", resumen: "text", contenido: "text" },
      name: "texto_titulo_resumen_contenido",
      default_language: "spanish",
    };

    const existingIndexes = await collection.indexes();

    // --- 1️⃣ Crea índices normales si no existen ---
    for (const idx of desiredIndexes) {
      const exists = existingIndexes.some(
        (ex) => JSON.stringify(ex.key) === JSON.stringify(idx.key)
      );

      if (exists) {
        console.log(chalk.yellow(`⚠️ Índice ya existe con configuración similar: ${JSON.stringify(idx.key)}`));
        continue;
      }

      await collection.createIndex(idx.key, { name: idx.name });
      console.log(chalk.green(`✅ Índice creado: ${idx.name}`));
    }

    // --- 2️⃣ Solo un índice de texto permitido ---
    const hasTextIndex = existingIndexes.some((ex) => ex.key?._fts === "text");
    if (!hasTextIndex) {
      await collection.createIndex(textIndex.key, {
        name: textIndex.name,
        default_language: "spanish",
        background: true,
      });
      console.log(chalk.green("✅ Índice de texto creado correctamente."));
    } else {
      console.log(chalk.yellow("⚠️ Ya existe un índice de texto, no se crea uno nuevo."));
    }

    console.log(chalk.greenBright("\n🚀 Todos los índices verificados y creados correctamente."));

  } catch (err) {
    console.error(chalk.red("\n❌ Error creando índices:"), err.message);
  } finally {
    await mongoose.disconnect();
    console.log(chalk.gray("\n🔒 Desconectado de MongoDB."));
    process.exit(0);
  }
}

createIndexes();
