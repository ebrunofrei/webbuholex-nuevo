// backend/services/db.js
// ============================================================
// 🦉 BúhoLex | Conexión única y robusta a MongoDB (IPv4 + reintentos)
// ============================================================

import mongoose from "mongoose";
import chalk from "chalk";

/* ------------------------ Settings de Mongoose ------------------------ */
mongoose.set("strictQuery", true);
if (
  process.env.VERCEL ||
  process.env.RAILWAY_ENVIRONMENT ||
  process.env.SERVERLESS === "1"
) {
  mongoose.set("bufferCommands", false);
}

/* ------------------------ Cache global ------------------------ */
const GLOBAL_KEY = "__buholex_mongoose";
const cached =
  globalThis[GLOBAL_KEY] || { conn: null, promise: null, listeners: false };
globalThis[GLOBAL_KEY] = cached;

/* ------------------------ Helpers entorno --------------------- */
export function getMongoUri() {
  return (
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    process.env.DATABASE_URL ||
    ""
  );
}

export function getDbName() {
  return (
    process.env.MONGODB_DBNAME ||
    process.env.MONGO_DBNAME ||
    process.env.DB_NAME ||
    "buholex"
  );
}

const isServerless =
  !!process.env.VERCEL ||
  !!process.env.RAILWAY_ENVIRONMENT ||
  process.env.SERVERLESS === "1";

/* ------------------------ Util IPv4 --------------------------- */
function ensureIPv4(uri = "") {
  if (!uri) return uri;
  if (/\bfamily=/.test(uri)) return uri; // if family is already set
  return uri + (uri.includes("?") ? "&" : "?") + "family=4";
}

/* ------------------------ Estado ------------------------------ */
export function mongoState() {
  return mongoose.connection?.readyState ?? 0;
}

export function mongoReady() {
  return mongoState() === 1;
}

export async function waitMongoReady({
  timeoutMs = 6000,
  intervalMs = 150,
} = {}) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (mongoReady()) return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return mongoReady();
}

/* ------------------------ Listeners (una vez) ----------------- */
function hookListenersOnce() {
  if (cached.listeners) return;
  mongoose.connection.once("connected", () => {
    const host = mongoose.connection.host ?? "?";
    const db = mongoose.connection.name ?? getDbName();
    console.log(
      chalk.green(`✅ Mongo conectado.`),
      chalk.gray(`(${host}/${db})`)
    );
  });
  mongoose.connection.on("error", (e) => {
    console.error(chalk.red("❌ Mongo error:"), e?.message || e);
  });
  mongoose.connection.on("disconnected", () => {
    console.warn(chalk.yellow("⚠️ Mongo desconectado."));
  });
  cached.listeners = true;
}

/* ------------------------ Conexión con reintentos ------------- */
async function connectWithRetry(uri, dbName, { attempts = 5 } = {}) {
  const u = ensureIPv4(uri);

  const opts = {
    dbName,
    family: 4,
    serverSelectionTimeoutMS: 12_000,
    socketTimeoutMS: 45_000,
    minPoolSize: 1,
    maxPoolSize: 10,
    autoIndex: process.env.NODE_ENV !== "production",
    readPreference: "primary",
  };

  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      const conn = await mongoose.connect(u, opts);
      hookListenersOnce();
      return conn;
    } catch (err) {
      lastErr = err;
      const base = Math.min(2000 * i, 8000);
      const jitter = Math.floor(Math.random() * 350);
      const wait = base + jitter;
      console.warn(
        chalk.yellow(
          `🔁 Intento ${i}/${attempts} falló: ${
            err?.message || err
          }. Reintento en ${wait}ms...`
        )
      );
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

/* ------------------------ API pública ------------------------- */
export async function dbConnect() {
  const uri = getMongoUri();
  const dbName = getDbName();

  if (!uri) {
    const msg =
      "No se encontró MONGODB_URI / MONGO_URI / DATABASE_URL en el entorno";
    console.error(chalk.red(`❌ ${msg}`));
    throw new Error(msg);
  }

  const state = mongoState(); // 0,1,2,3

  // Ya conectado → devolvemos conexión
  if (state === 1 && cached.conn) {
    return cached.conn;
  }

  // Si está conectando y hay promesa cacheada → esperamos esa misma
  if (state === 2 && cached.promise) {
    return cached.promise;
  }

  // Si está desconectado (0) o desconectando (3), o no hay promesa válida,
  // creamos SIEMPRE una nueva promesa de conexión.
  if (!cached.promise || state === 0 || state === 3) {
    console.log(
      chalk.yellow("⏳ Conectando a MongoDB..."),
      chalk.gray(`DB: ${dbName}`)
    );

    cached.promise = connectWithRetry(uri, dbName)
      .then((c) => {
        cached.conn = c;
        return c;
      })
      .catch((e) => {
        cached.promise = null;
        throw e;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

/** Conexión “suave”: NO lanza; retorna conexión o null */
export async function dbTryConnect() {
  try {
    return await dbConnect();
  } catch (e) {
    console.warn(
      chalk.yellow(
        "⚠️ dbTryConnect: continúa sin Mongo (" + (e?.message || e) + ")"
      )
    );
    return null;
  }
}

/** Desconexión segura (pensada para scrapers / CLI) */
export async function dbDisconnect() {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  } catch {
    // noop
  } finally {
    cached.conn = null;
    cached.promise = null;
  }
}

/* ------------------------ Cierre limpio ----------------------- */
if (!isServerless) {
  for (const sig of ["SIGINT", "SIGTERM"]) {
    process.on(sig, async () => {
      try {
        await dbDisconnect();
      } finally {
        process.exit(0);
      }
    });
  }
}

/* ------------------------ Default + alias (compat) ------------ */
export const connectDB = dbConnect;
export const disconnectDB = dbDisconnect;

export default {
  dbConnect,
  dbTryConnect,
  dbDisconnect,
  connectDB,
  disconnectDB,
  mongoState,
  mongoReady,
  waitMongoReady,
  getMongoUri,
  getDbName,
};
