// ============================================================
// 🦉 BÚHOLEX | Backend Unificado y Escalable
// ============================================================
// Arquitectura profesional: conexión segura a MongoDB Atlas,
// CORS dinámico, logging colorizado, healthcheck, cronjobs
// y rutas modulares. Compatible con Railway, Vercel y local.
// ============================================================

import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";
import cron from "node-cron";

// === 🔗 Conexión MongoDB ===
import { connectDB, disconnectDB } from "./backend/services/db.js";

// === 🧭 Rutas principales ===
import noticiasRoutes from "./backend/routes/noticias.js";
import noticiasContenidoRoutes from "./backend/routes/noticiasContenido.js";
import iaRoutes from "./backend/routes/ia.js";
import usuariosRoutes from "./backend/routes/usuarios.js";
import culqiRoutes from "./backend/routes/culqi.js";
import notificacionesRoutes from "./backend/routes/notificaciones.js";
import noticiasGuardadasRoutes from "./backend/routes/noticiasGuardadas.js";
import mediaProxyRoutes from "./backend/routes/mediaProxy.js";
import traducirRoutes from "./backend/routes/traducir.js";

// === 🕒 Cron Jobs ===
import { cleanupLogs } from "./backend/jobs/cleanupLogs.js";
import { jobNoticias } from "./backend/jobs/cronNoticias.js";
import { maintainIndexes } from "./scripts/maintain-indexes.js";

// ============================================================
// ⚙️ Configuración base
// ============================================================

dotenv.config(); // Detecta automáticamente Railway o .env.local
const NODE_ENV = process.env.NODE_ENV || "production";
const PORT = process.env.PORT || 8080;
const app = express();
const START_TIME = new Date();

// ============================================================
// 🌍 CORS Dinámico + Middlewares base
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
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// ============================================================
// 🩺 Healthcheck y estado general
// ============================================================

app.get("/", (_req, res) =>
  res.type("text/plain").send("🦉 Servidor BúhoLex operativo 🚀")
);

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    env: NODE_ENV,
    uptime: `${process.uptime().toFixed(0)}s`,
    startedAt: START_TIME.toISOString(),
    now: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    database: "MongoDB Atlas conectado ✅",
  });
});

// ============================================================
// 🚀 Inicialización principal
// ============================================================

(async () => {
  try {
    console.log(chalk.yellowBright("\n⏳ Intentando conectar a MongoDB Atlas..."));
    await connectDB();
    console.log(chalk.greenBright("✅ Conexión establecida correctamente."));

    // ------------------------------------------------------------
    // 🔗 Cargar rutas de API
    // ------------------------------------------------------------
    app.use("/api/media", mediaProxyRoutes);
    app.use("/api/noticias", noticiasRoutes);
    app.use("/api/noticias/contenido", noticiasContenidoRoutes);
    app.use("/api/noticias-guardadas", noticiasGuardadasRoutes);
    app.use("/api/ia", iaRoutes);
    app.use("/api/usuarios", usuariosRoutes);
    app.use("/api/culqi", culqiRoutes);
    app.use("/api/notificaciones", notificacionesRoutes);
    app.use("/api/traducir", traducirRoutes);

    // ------------------------------------------------------------
    // 📂 Archivos estáticos (por si se suben imágenes)
    // ------------------------------------------------------------
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    app.use("/uploads", express.static(path.join(__dirname, "uploads")));

    // ------------------------------------------------------------
    // 🕒 CronJobs Automáticos
    // ------------------------------------------------------------
    cleanupLogs?.();
    jobNoticias?.();

    cron.schedule("0 3 * * 0", async () => {
      console.log(chalk.magentaBright("\n🧹 [Cron] Mantenimiento semanal..."));
      try {
        await maintainIndexes();
        console.log(chalk.green("✅ Índices optimizados correctamente."));
      } catch (err) {
        console.error(chalk.red("❌ Error en mantenimiento:"), err.message);
      }
    });

    // ------------------------------------------------------------
    // ❌ Ruta no encontrada (404)
    // ------------------------------------------------------------
    app.use((req, res) => {
      res.status(404).json({ error: "Ruta no encontrada" });
    });

    // ------------------------------------------------------------
    // 🧩 Manejo global de errores
    // ------------------------------------------------------------
    process.on("unhandledRejection", (reason) => {
      console.error(chalk.red("⚠️ [Promesa no manejada]"), reason);
    });

    process.on("SIGINT", async () => {
      console.log(chalk.yellow("\n🛑 Cerrando servidor..."));
      await disconnectDB();
      process.exit(0);
    });

    // ------------------------------------------------------------
    // 🚀 Iniciar servidor único
    // ------------------------------------------------------------
    app.listen(PORT, "0.0.0.0", () => {
      console.log(chalk.greenBright(`\n🚀 Servidor BúhoLex corriendo en puerto ${PORT}`));
      console.log(chalk.cyanBright("🌍 Orígenes permitidos por CORS:"));
      corsOrigins.forEach((o) => console.log("   ", chalk.gray("-", o)));
    });
  } catch (err) {
    console.error(chalk.red("❌ Error crítico al iniciar servidor:"), err.message);
    process.exit(1);
  }
})();
