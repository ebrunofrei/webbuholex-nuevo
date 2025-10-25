// backend/services/db.js
// ============================================================
// 🦉 Conexión a MongoDB Atlas centralizada
// Maneja conexión única y reuso en producción
// ============================================================

import mongoose from "mongoose";
import chalk from "chalk";

let isConnecting = false;

export async function connectDB() {
  // Priorizamos nombres que sí existen en Railway
  const MONGO_URI =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI || // fallback por si local usaba otro nombre
    "";

  const DB_NAME =
    process.env.MONGODB_DBNAME ||
    process.env.MONGO_DBNAME ||
    process.env.DB_NAME ||
    "buholex";

  if (!MONGO_URI) {
    console.error(
      chalk.redBright(
        "❌ No se encontró MONGODB_URI / MONGO_URI en las variables de entorno."
      )
    );
    throw new Error("No se encontró MONGODB_URI");
  }

  // Ya hay conexión activa reutilizable
  if (global.mongoose && global.mongoose.connection?.readyState === 1) {
    console.log(
      chalk.greenBright("✅ Reusando conexión existente a MongoDB Atlas.")
    );
    return global.mongoose;
  }

  if (isConnecting) {
    console.log(
      chalk.yellow("⏳ Conexión a MongoDB ya en progreso, reutilizando promesa...")
    );
    return;
  }

  try {
    console.log(chalk.yellow("⏳ Intentando conectar a MongoDB Atlas..."));
    isConnecting = true;

    const conn = await mongoose.connect(MONGO_URI, {
      dbName: DB_NAME,
      // useNewUrlParser y useUnifiedTopology ya no hacen falta en mongoose >=6
    });

    global.mongoose = conn;

    console.log(
      chalk.greenBright("✅ Conectado a MongoDB Atlas."),
      chalk.gray(`DB: ${DB_NAME}`)
    );
    return conn;
  } catch (err) {
    console.error(
      chalk.redBright("❌ Error al conectar a MongoDB Atlas:"),
      err.message
    );
    throw err;
  } finally {
    isConnecting = false;
  }
}
