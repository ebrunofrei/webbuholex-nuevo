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

// Obtener el entorno de ejecución (desarrollo o producción)
const NODE_ENV = process.env.NODE_ENV || "production";
const PORT = process.env.PORT || 3000;
const app = express();
const START_TIME = new Date();

// ===============================
// Configuración de CORS (diferente según entorno)
// ===============================

const defaultOrigins = [
  "http://localhost:5173", // Para desarrollo local
  "http://127.0.0.1:5173", // Para desarrollo local
  "https://buholex.com", // URL de producción
  "https://www.buholex.com", // URL de producción
  "https://webbuholex-nuevo.vercel.app", // URL de producción en Vercel
];

// Cargar orígenes desde las variables de entorno en producción
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((s) => s.trim())
  : defaultOrigins;

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // Permitir sin encabezado origin
      if (corsOrigins.includes(origin)) return cb(null, true);
      console.warn(chalk.yellow(`⚠️ [CORS] Bloqueado: ${origin}`));
      return cb(new Error(`CORS no permitido: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// ============================================================
// Definición de las URLs de los servicios
// ============================================================

// Para el entorno de desarrollo, la API estará en localhost
const BACKEND_URL = NODE_ENV === "production"
  ? process.env.VITE_BACKEND_URL // URL de backend en producción (ej. Railway, Vercel)
  : "http://localhost:3000"; // URL de backend en desarrollo (localhost)

// ============================================================
// Iniciar servidor y conectar a MongoDB
// ============================================================

(async () => {
  try {
    console.log(chalk.yellowBright("\n⏳ Intentando conectar a MongoDB Atlas..."));
    await connectDB(); // Conexión a MongoDB Atlas
    console.log(chalk.greenBright("✅ Conexión establecida correctamente."));

    // Definir rutas y middlewares de la API
    app.use("/api/media", mediaProxyRoutes);
    app.use("/api/noticias", noticiasRoutes);
    app.use("/api/noticias/contenido", noticiasContenidoRoutes);
    app.use("/api/noticias-guardadas", noticiasGuardadasRoutes);
    app.use("/api/ia", iaRoutes);
    app.use("/api/usuarios", usuariosRoutes);
    app.use("/api/culqi", culqiRoutes);
    app.use("/api/notificaciones", notificacionesRoutes);
    app.use("/api/traducir", traducirRoutes);

    // Rutas de Healthcheck
    app.get("/", (_req, res) => res.send("🦉 Servidor BúhoLex operativo 🚀"));
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

    // Iniciar servidor
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
