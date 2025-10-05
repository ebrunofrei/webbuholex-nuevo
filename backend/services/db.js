// ============================================================
// 🦉 BÚHOLEX | Conexión central a MongoDB (Atlas o Local)
// ============================================================
// Con reconexión automática, fallback local, logs detallados,
// y compatibilidad total con Atlas, Railway y Windows local.
// ============================================================

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import chalk from "chalk";

// ====== Cargar entorno dinámicamente ======
const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";

dotenv.config({ path: path.resolve(process.cwd(), envFile) });

let isConnected = false;
let retries = 0;
const MAX_RETRIES = 5;

/**
 * 🧠 Conecta a MongoDB (Atlas o fallback local)
 */
export async function connectDB() {
  if (isConnected) {
    console.log(chalk.blue("⚡ Conexión MongoDB ya activa. Reutilizando conexión existente."));
    return mongoose.connection;
  }

  const atlasUri = process.env.MONGO_URI;
  const localUri = process.env.MONGO_URI_LOCAL || "mongodb://127.0.0.1:27017/buholex";

  if (!atlasUri) {
    throw new Error(chalk.red("❌ No se encontró MONGO_URI en el archivo .env."));
  }

  mongoose.set("strictQuery", true);
  mongoose.set("bufferCommands", false);

  // Función interna de intento con backoff exponencial
  async function tryConnect(uri, label) {
    const start = Date.now();
    try {
      await mongoose.connect(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 30000,
        connectTimeoutMS: 15000,
        retryWrites: true,
      });
      const elapsed = ((Date.now() - start) / 1000).toFixed(2);
      console.log(chalk.greenBright(`✅ Conectado a MongoDB [${label}] en ${elapsed}s`));
      isConnected = true;
      return true;
    } catch (err) {
      console.error(chalk.red(`⚠️ Error conectando a ${label}:`), err.message);
      return false;
    }
  }

  // --- Intentar conexión con Atlas, luego fallback local ---
  const connectedToAtlas = await tryConnect(atlasUri, "Atlas");
  if (connectedToAtlas) return mongoose.connection;

  console.log(chalk.yellow("↩️ Intentando fallback a MongoDB local..."));
  const connectedToLocal = await tryConnect(localUri, "Local");
  if (connectedToLocal) return mongoose.connection;

  // --- Si falla todo, reintentar con backoff ---
  while (!isConnected && retries < MAX_RETRIES) {
    retries++;
    const delay = Math.pow(2, retries) * 1000;
    console.log(chalk.yellow(`🔄 Reintentando conexión (${retries}/${MAX_RETRIES}) en ${delay / 1000}s...`));
    await new Promise((res) => setTimeout(res, delay));

    const retried = await tryConnect(atlasUri, "Atlas");
    if (retried) return mongoose.connection;
  }

  throw new Error(chalk.red("❌ Falló la conexión a MongoDB después de múltiples intentos."));
}

/**
 * 🔌 Desconecta MongoDB limpiamente
 */
export async function disconnectDB() {
  if (!isConnected) return;
  try {
    await mongoose.disconnect();
    isConnected = false;
    console.log(chalk.yellow("🛑 Conexión MongoDB cerrada correctamente."));
  } catch (err) {
    console.error(chalk.red("⚠️ Error al desconectar MongoDB:"), err.message);
  }
}
