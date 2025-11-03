// ============================================================
// 🦉 BÚHOLEX | Servidor Unificado (Express + MongoDB + IA)
// ============================================================

import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import chalk from "chalk";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import mongoose from "mongoose";

// DB helper (nombres reales)
import { dbConnect, getMongoUri } from "./backend/services/db.js";

// Rutas
import noticiasRoutes from "./backend/routes/noticias.js";
import noticiasContenidoRoutes from "./backend/routes/noticiasContenido.js";
import newsRoutes from "./backend/routes/news.js";
import iaRoutes from "./backend/routes/ia.js";
import usuariosRoutes from "./backend/routes/usuarios.js";
import culqiRoutes from "./backend/routes/culqi.js";
import notificacionesRoutes from "./backend/routes/notificaciones.js";
import noticiasGuardadasRoutes from "./backend/routes/noticiasGuardadas.js";
import traducirRoutes from "./backend/routes/traducir.js";
import vozRoutes from "./backend/routes/voz.js";
import newsLiveRouter from "./backend/routes/news-live.js";
import mediaRoutes from "./backend/routes/media.js";

// ============================================================
// Carga temprana del entorno (.env)
// ============================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : process.env.NODE_ENV === "development"
    ? ".env.development"
    : ".env.local";

const envPath = path.resolve(__dirname, envFile);

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(chalk.cyanBright(`📦 Variables cargadas desde ${envFile}`));
} else {
  dotenv.config();
  console.warn(chalk.yellow(`⚠️ No se encontró ${envFile}, usando .env por defecto.`));
}

// ============================================================
// Variables base del servidor
// ============================================================

const NODE_ENV = process.env.NODE_ENV || "production";
const PORT = process.env.PORT || 3000;
const START_TIME = new Date();

console.log(chalk.blueBright(`🧠 Entorno activo: ${NODE_ENV}`));
console.log(
  process.env.OPENAI_API_KEY
    ? chalk.greenBright("🔑 OPENAI_API_KEY detectada correctamente ✅")
    : chalk.redBright("❌ Falta configurar OPENAI_API_KEY en el entorno ⚠️")
);

// ============================================================
// Inicialización de Express
// ============================================================

const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.get("/alive", (_req, res) => res.type("text/plain").send("ok"));

// ============================================================
// CORS (con listas y patrones)
// ============================================================

const localOrigins = [
  ...Array.from({ length: 30 }, (_, i) => `http://localhost:${5170 + i}`),
  ...Array.from({ length: 30 }, (_, i) => `http://127.0.0.1:${5170 + i}`),
];

const envOrigins = (process.env.FRONTEND_ORIGIN || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const originRegex = [
  /\.vercel\.app$/i,
  /\.railway\.app$/i,
];

const allowedExact = new Set([
  "https://buholex.com",
  "https://www.buholex.com",
  "https://webbuholex-nuevo.vercel.app",
  ...(process.env.FRONTEND_ORIGIN || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean),
]);

const allowedByPattern = (origin) => {
  try {
    const u = new URL(origin);
    const host = u.hostname;
    // permite cualquier preview de Vercel de tu proyecto y subdominios de railway
    if (host.endsWith(".vercel.app")) return true;
    if (host.endsWith(".railway.app")) return true;
    return false;
  } catch { return false; }
};

const corsDelegate = (origin, cb) => {
  if (!origin) return cb(null, true); // navegadores sin Origin
  if (allowedExact.has(origin) || allowedByPattern(origin)) return cb(null, true);
  console.warn(chalk.yellow(`⚠️ [CORS] Bloqueado: ${origin}`));
  return cb(new Error(`CORS no permitido: ${origin}`));
};

app.use(cors({
  origin: corsDelegate,
  methods: ["GET","POST","PUT","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"],
  credentials: true,
  optionsSuccessStatus: 204,
}));

// Forzar charset UTF-8 en JSON bajo /api
app.use("/api", (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return originalJson(body);
  };
  next();
});

// ============================================================
// Health
// ============================================================

app.get("/api/health", (_req, res) => {
  const openaiStatus = process.env.OPENAI_API_KEY
    ? "✅ OpenAI API Key cargada correctamente"
    : "❌ Falta configurar OPENAI_API_KEY";

  const mongoStatus =
    mongoose.connection?.readyState === 1 ? "✅ Conectado a MongoDB Atlas" : "⚠️ MongoDB no conectado";

  return res.status(200).json({
    ok: true,
    entorno: NODE_ENV,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    openai: openaiStatus,
    mongo: mongoStatus,
    cors: allowedOrigins,
    uptime: `${process.uptime().toFixed(0)}s`,
    startedAt: START_TIME.toISOString(),
  });
});

// Aliases de health por área
app.get("/api/news/health", (_req, res) => res.status(200).json({ ok: true, area: "news", ts: Date.now() }));
app.get("/api/noticias/health", (_req, res) => res.status(200).json({ ok: true, area: "noticias", ts: Date.now() }));
app.get("/health", (_req, res) => res.status(200).json({ ok: true, ts: Date.now() }));

// ============================================================
// Rutas API principales (orden específico)
// ============================================================

app.use("/api/noticias/contenido", noticiasContenidoRoutes);
app.use("/api/news", newsLiveRouter);
app.use("/api/noticias", noticiasRoutes);
app.use("/api/noticias-guardadas", noticiasGuardadasRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/ia", iaRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/culqi", culqiRoutes);
app.use("/api/notificaciones", notificacionesRoutes);
app.use("/api/traducir", traducirRoutes);
app.use("/api/voz", vozRoutes);
app.use("/api/media", mediaRoutes);

// 404 JSON solo /api
app.use("/api", (_req, res) => res.status(404).json({ ok: false, error: "Ruta no encontrada" }));

// ============================================================
// Cargas opcionales SOLO en desarrollo/local
// ============================================================

async function cargarTareasOpcionales() {
  if (NODE_ENV === "production") {
    console.log(chalk.gray("⏭ Saltando tareas internas (cron / maintain-indexes) en producción"));
    return;
  }
  try {
    const { cleanupLogs } = await import("./backend/jobs/cleanupLogs.js");
    const { jobNoticias } = await import("./backend/jobs/cronNoticias.js");
    if (cleanupLogs || jobNoticias) {
      console.log(chalk.gray("🧹 Tareas opcionales disponibles en entorno no productivo"));
    }
  } catch (err) {
    console.warn(chalk.yellow("⚠️ No se pudieron cargar cleanupLogs/cronNoticias (ok en prod):"), err.message);
  }

  try {
    const { maintainIndexes } = await import("./scripts/maintain-indexes.js");
    if (typeof maintainIndexes === "function") {
      console.log(chalk.gray("🛠 Ejecutando maintainIndexes() en entorno no productivo..."));
      await maintainIndexes();
    }
  } catch (err) {
    console.warn(chalk.yellow("⚠️ maintain-indexes.js no disponible (ok si estás en prod):"), err.message);
  }
}

// ============================================================
// Arranque del servidor
// ============================================================

export { app };

if (process.env.NODE_ENV !== "test") {
  (async () => {
    try {
      console.log(chalk.yellowBright("\n⏳ Intentando conectar a MongoDB Atlas..."));
      const uri = process.env.MONGODB_URI || getMongoUri();
      await dbConnect(uri);
      console.log(chalk.greenBright("✅ Conexión establecida correctamente."));

      await cargarTareasOpcionales();

      const server = app.listen(PORT, "0.0.0.0", () => {
        console.log(chalk.greenBright(`\n🚀 Servidor BúhoLex corriendo en puerto ${PORT}`));
        console.log(chalk.cyanBright("🌍 Orígenes permitidos por CORS:"));
        allowedOrigins.forEach((o) => console.log("   ", chalk.gray("-", o)));
      });

      server.keepAliveTimeout = 75_000;
      server.headersTimeout = 80_000;
    } catch (err) {
      console.error(chalk.red("❌ Error crítico al iniciar servidor:"), err.message);
      process.exit(1);
    }
  })();
}
