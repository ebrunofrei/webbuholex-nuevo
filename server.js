// ============================================================
// 🦉 BÚHOLEX | Backend Unificado (Railway + Vercel + Local)
// ============================================================
// Conexión garantizada a MongoDB, CORS dinámico, logs visibles,
// mantenimiento automático e integración con frontend.
// ============================================================

import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import chalk from "chalk";
import path from "path";
import { fileURLToPath } from "url";
import cron from "node-cron";

// === Conexión MongoDB ===
import { connectDB, disconnectDB } from "./backend/services/db.js";

// === Rutas principales ===
import noticiasRoutes from "./backend/routes/noticias.js";
import noticiasContenidoRoutes from "./backend/routes/noticiasContenido.js";
import iaRoutes from "./backend/routes/ia.js";
import usuariosRoutes from "./backend/routes/usuarios.js";
import culqiRoutes from "./backend/routes/culqi.js";
import notificacionesRoutes from "./backend/routes/notificaciones.js";
import noticiasGuardadasRoutes from "./backend/routes/noticiasGuardadas.js";
import mediaProxyRoutes from "./backend/routes/mediaProxy.js";
import traducirRoutes from "./backend/routes/traducir.js";

// === Cron Jobs ===
import { cleanupLogs } from "./backend/jobs/cleanupLogs.js";
import { jobNoticias } from "./backend/jobs/cronNoticias.js";

// === Scripts auxiliares ===
import { maintainIndexes } from "./scripts/maintain-indexes.js";

// ============================================================
// ⚙️ Configuración general
// ============================================================

const NODE_ENV = process.env.NODE_ENV || "production";
dotenv.config({ path: `.env.${NODE_ENV}` });

const app = express();
const PORT = process.env.PORT || 3000;
const START_TIME = new Date();

// ============================================================
// 🔧 CORS
// ============================================================

const defaultOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://buholex.com",
  "https://www.buholex.com",
  "https://webbuholex-nuevo.vercel.app",
];

const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((s) => s.trim())
  : defaultOrigins;

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (corsOrigins.includes(origin)) return cb(null, true);
      console.warn(chalk.red(`⚠️ [CORS] Bloqueado para: ${origin}`));
      return cb(new Error(`CORS no permitido para ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

// ============================================================
// 🧱 Middlewares base
// ============================================================

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// ============================================================
// 🩺 Healthcheck global (disponible aunque Mongo falle)
// ============================================================

app.get("/", (_req, res) => res.type("text/plain").send("ok"));
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    status: "healthy",
    env: NODE_ENV,
    uptime: process.uptime(),
    startedAt: START_TIME.toISOString(),
    now: new Date().toISOString(),
  });
});

// ============================================================
// 🚀 Inicialización principal
// ============================================================

(async () => {
  try {
    console.log(chalk.yellow("⏳ Intentando conectar a MongoDB..."));
    await connectDB();
    console.log(chalk.green("✅ Conexión MongoDB establecida."));

    // --------------------------------------------------------
    // 🌐 Rutas API
    // --------------------------------------------------------
    app.use("/api/media", mediaProxyRoutes);
    app.use("/api/noticias", noticiasRoutes);
    app.use("/api/noticias/contenido", noticiasContenidoRoutes);
    app.use("/api/noticias-guardadas", noticiasGuardadasRoutes);
    app.use("/api/ia", iaRoutes);
    app.use("/api/usuarios", usuariosRoutes);
    app.use("/api/culqi", culqiRoutes);
    app.use("/api/notificaciones", notificacionesRoutes);
    app.use("/api/traducir", traducirRoutes);

    // --------------------------------------------------------
    // 🗂️ Archivos estáticos
    // --------------------------------------------------------
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    app.use("/uploads", express.static(path.join(__dirname, "uploads")));

    // --------------------------------------------------------
    // 🕒 Cron Jobs (solo si DB activa)
    // --------------------------------------------------------
    cleanupLogs?.();
    jobNoticias?.();

    cron.schedule("0 3 * * 0", async () => {
      console.log(chalk.magenta("\n🧹 [Cron] Mantenimiento semanal..."));
      try {
        await maintainIndexes();
        console.log(chalk.green("✅ Mantenimiento de índices completado."));
      } catch (err) {
        console.error(chalk.red("❌ Error en mantenimiento:"), err.message);
      }
    });

    // --------------------------------------------------------
    // ❌ 404 Fallback
    // --------------------------------------------------------
    app.use((req, res) => {
      res.status(404).json({ error: "Ruta no encontrada" });
    });

    // --------------------------------------------------------
    // 🧩 Manejo de errores global
    // --------------------------------------------------------
    process.on("unhandledRejection", (reason) => {
      console.error(chalk.red("⚠️ Rechazo no manejado:"), reason);
    });

    process.on("SIGINT", async () => {
      console.log(chalk.yellow("\n🛑 Cerrando servidor..."));
      await disconnectDB();
      process.exit(0);
    });

    // --------------------------------------------------------
    // 🚀 Iniciar servidor
    // --------------------------------------------------------
    app.listen(PORT, "0.0.0.0", () => {
      console.log(chalk.greenBright(`🚀 Servidor BúhoLex operativo en puerto ${PORT}`));
      console.log(chalk.cyan("🌍 Orígenes permitidos por CORS:"));
      corsOrigins.forEach((o) => console.log("   ", chalk.gray("-", o)));
    });
  } catch (err) {
    console.error(chalk.red("❌ Error crítico al iniciar servidor:"), err.message);
  }
})();
