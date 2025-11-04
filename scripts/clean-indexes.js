/**
 * 🧹 clean-indexes.js
 * Elimina índices duplicados de la colección "noticias" en MongoDB Atlas
 * manteniendo únicamente el índice principal _id_.
 */

import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";
import chalk from "chalk";

// Carga dinámica del .env correcto
const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env.development";
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_URL_LOCAL;

async function cleanIndexes() {
  console.log(chalk.cyan("\n🔍 Conectando a MongoDB para limpiar índices..."));

  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 30000,
    });

    console.log(chalk.green("✅ Conectado correctamente a MongoDB Atlas"));
    const db = mongoose.connection.db;
    const collection = db.collection("noticias");

    // Listar índices existentes
    const indexes = await collection.indexes();
    console.log(chalk.yellow("\n📋 Índices actuales:"));
    indexes.forEach((idx) => console.log(" •", idx.name));

    // Eliminar todos excepto _id_
    const toDrop = indexes.filter((i) => i.name !== "_id_").map((i) => i.name);
    if (toDrop.length === 0) {
      console.log(chalk.green("\n✨ No hay índices adicionales que eliminar."));
    } else {
      for (const name of toDrop) {
        await collection.dropIndex(name);
        console.log(chalk.red(`🗑️ Eliminado índice: ${name}`));
      }
      console.log(chalk.green(`\n✅ Eliminados ${toDrop.length} índice(s) duplicado(s).`));
    }

  } catch (err) {
    console.error(chalk.red("\n❌ Error durante la limpieza:"), err.message);
  } finally {
    await mongoose.disconnect();
    console.log(chalk.gray("\n🔒 Desconectado de MongoDB."));
    process.exit(0);
  }
}

cleanIndexes();
