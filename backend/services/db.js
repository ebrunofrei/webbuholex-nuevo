// backend/services/db.js
// ============================================================
// 🦉 BúhoLex | Conexión única y robusta a MongoDB (IPv4 + reintentos)
// ============================================================

import mongoose from "mongoose";
import chalk from "chalk";

/* ------------------------ Cache global ------------------------ */
const GLOBAL_KEY = "__buholex_mongoose";
const cached = global[GLOBAL_KEY] || { conn: null, promise: null, listeners: false };
global[GLOBAL_KEY] = cached;

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
  !!process.env.VERCEL || !!process.env.RAILWAY_ENVIRONMENT || process.env.SERVERLESS === "1";

/* ------------------------ Util IPv4 --------------------------- */
function ensureIPv4(uri = "") {
  if (!uri) return uri;
  if (/\bfamily=/.test(uri)) return uri;
  return uri + (uri.includes("?") ? "&" : "?") + "family=4";
}

/* ------------------------ Estado ------------------------------ */
export function mongoState() {
  // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
  return mongoose.connection?.readyState ?? 0;
}
export function mongoReady() {
  return mongoState() === 1;
}
export async function waitMongoReady({ timeoutMs = 6000, intervalMs = 150 } = {}) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (mongoReady()) return true;
    await new Promise(r => setTimeout(r, intervalMs));
  }
  return mongoReady();
}

/* ------------------------ Listeners (una vez) ----------------- */
function hookListenersOnce() {
  if (cached.listeners) return;
  mongoose.connection.once("connected", () => {
    console.log(chalk.green("✅ Mongo conectado."), chalk.gray(`(${getDbName()})`));
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
    serverSelectionTimeoutMS: 10_000,
    socketTimeoutMS: 20_000,
    minPoolSize: 1,
    maxPoolSize: 10,
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
          `🔁 Intento ${i}/${attempts} falló: ${err?.message || err}. Reintento en ${wait}ms...`
        )
      );
      await new Promise(r => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

/* ------------------------ API pública ------------------------- */
/** Conexión “fuerte”: lanza error si no logra conectar */
export async function dbConnect() {
  const uri = getMongoUri();
  const dbName = getDbName();

  if (!uri) {
    const msg = "No se encontró MONGODB_URI / MONGO_URI / DATABASE_URL en el entorno";
    console.error(chalk.red(`❌ ${msg}`));
    throw new Error(msg);
  }

  if (cached.conn && mongoReady()) return cached.conn;

  if (!cached.promise) {
    console.log(chalk.yellow("⏳ Conectando a MongoDB..."), chalk.gray(`DB: ${dbName}`));
    cached.promise = connectWithRetry(uri, dbName).then((c) => (cached.conn = c));
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } finally {
    if (!mongoReady()) cached.promise = null; // limpia si falló
  }
}

/** Conexión “suave”: NO lanza; retorna conexión o null */
export async function dbTryConnect() {
  try {
    return await dbConnect();
  } catch (e) {
    console.warn(chalk.yellow("⚠️ dbTryConnect: continúa sin Mongo (" + (e?.message || e) + ")"));
    return null;
  }
}

/** Desconexión segura */
export async function dbDisconnect() {
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {}
  }
  cached.conn = null;
  cached.promise = null;
}

/* ------------------------ Cierre limpio ----------------------- */
if (!isServerless) {
  for (const sig of ["SIGINT", "SIGTERM"]) {
    process.on(sig, async () => {
      try { await dbDisconnect(); } finally { process.exit(0); }
    });
  }
}

/* ------------------------ Default (compat) -------------------- */
export default {
  dbConnect,
  dbTryConnect,
  dbDisconnect,
  mongoState,
  mongoReady,
  waitMongoReady,
  getMongoUri,
  getDbName,
};
