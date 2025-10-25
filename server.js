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
import cron from "node-cron";

// ============================================================
// ⚙️ Carga temprana del entorno (.env)
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
  console.warn(
    chalk.yellow(`⚠️ No se encontró ${envFile}, usando .env por defecto.`)
  );
}

// ============================================================
// 🔧 Variables base del servidor
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
// 🔗 Conexión MongoDB
// ============================================================

import { connectDB } from "./backend/services/db.js";

// ============================================================
// 🧭 Importación de rutas principales
// ============================================================

import noticiasRoutes from "./backend/routes/noticias.js";
import noticiasContenidoRoutes from "./backend/routes/noticiasContenido.js";
import newsRoutes from "./backend/routes/news.js";
import iaRoutes from "./backend/routes/ia.js";
import usuariosRoutes from "./backend/routes/usuarios.js";
import culqiRoutes from "./backend/routes/culqi.js";
import notificacionesRoutes from "./backend/routes/notificaciones.js";
import noticiasGuardadasRoutes from "./backend/routes/noticiasGuardadas.js";
import mediaProxyRoutes from "./backend/routes/mediaProxy.js";
import traducirRoutes from "./backend/routes/traducir.js";
import vozRoutes from "./backend/routes/voz.js";

// 🚨 Próximo paso: ruta del chat
// import chatRoutes from "./backend/routes/chat.js"; // <- la vamos a crear luego

// ============================================================
// 🕒 Cron Jobs
// ============================================================

import { cleanupLogs } from "./backend/jobs/cleanupLogs.js";
import { jobNoticias } from "./backend/jobs/cronNoticias.js";
import { maintainIndexes } from "./scripts/maintain-indexes.js";

// ============================================================
// 🚀 Inicialización de Express
// ============================================================

const app = express();

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// ============================================================
// 🔒 Configuración dinámica de CORS
// ============================================================
//
// Reglas:
// 1. Permitimos localhost y 127.0.0.1 en puertos 5170-5199 para desarrollo Vite.
// 2. Permitimos explícitamente los orígenes declarados en FRONTEND_ORIGIN
//    (que tú configuras en Railway Variables).
//

// localhost para desarrollo
const localOrigins = [
  ...Array.from({ length: 30 }, (_, i) => `http://localhost:${5170 + i}`),
  ...Array.from({ length: 30 }, (_, i) => `http://127.0.0.1:${5170 + i}`),
];

// dominios declarados en entorno (producción y previsualizaciones vercel)
const envOrigins = (process.env.FRONTEND_ORIGIN || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// fallback de seguridad en caso no exista FRONTEND_ORIGIN (lo ideal es que sí exista)
const defaultProdOrigins = [
  "https://buholex.com",
  "https://www.buholex.com",
  "https://webbuholex-nuevo.vercel.app",
];

// lista final
const allowedOrigins = Array.from(
  new Set([...localOrigins, ...envOrigins, ...defaultProdOrigins])
);

app.use(
  cors({
    origin: (origin, cb) => {
      // llamadas tipo Postman/cURL no traen origin → las dejamos pasar
      if (!origin) return cb(null, true);

      if (allowedOrigins.includes(origin)) {
        return cb(null, true);
      }

      console.warn(chalk.yellow(`⚠️ [CORS] Bloqueado: ${origin}`));
      return cb(new Error(`CORS no permitido: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// ============================================================
// 🌡️ Ruta de diagnóstico /api/health
// ============================================================

app.get("/api/health", async (_req, res) => {
  try {
    const openaiStatus = process.env.OPENAI_API_KEY
      ? "✅ OpenAI API Key cargada correctamente"
      : "❌ Falta configurar OPENAI_API_KEY";

    const mongoStatus =
      global.mongoose?.connection?.readyState === 1
        ? "✅ Conectado a MongoDB Atlas"
        : "⚠️ MongoDB no conectado";

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
  } catch (err) {
    console.error("❌ Error en /api/health:", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================
// 🧩 Rutas API principales
// ============================================================

app.use("/api/media", mediaProxyRoutes);
app.use("/api/noticias", noticiasRoutes);
app.use("/api/noticias/contenido", noticiasContenidoRoutes);
app.use("/api/noticias-guardadas", noticiasGuardadasRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/ia", iaRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/culqi", culqiRoutes);
app.use("/api/notificaciones", notificacionesRoutes);
app.use("/api/traducir", traducirRoutes);
app.use("/api", vozRoutes);

// 🗣 Chat IA (lo montamos en el siguiente paso)
// app.use("/api/chat", chatRoutes);

// ============================================================
// 🧠 Conexión y arranque del servidor
// ============================================================

(async () => {
  try {
    console.log(
      chalk.yellowBright("\n⏳ Intentando conectar a MongoDB Atlas...")
    );
    await connectDB();
    console.log(chalk.greenBright("✅ Conexión establecida correctamente."));

    app.listen(PORT, "0.0.0.0", () => {
      console.log(
        chalk.greenBright(`\n🚀 Servidor BúhoLex corriendo en puerto ${PORT}`)
      );
      console.log(chalk.cyanBright("🌍 Orígenes permitidos por CORS:"));
      allowedOrigins.forEach((o) =>
        console.log("   ", chalk.gray("-", o))
      );
    });
  } catch (err) {
    console.error(
      chalk.red("❌ Error crítico al iniciar servidor:"),
      err.message
    );
    process.exit(1);
  }
})();
