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
// 🧭 Importación de rutas principales (estas sí están en repo)
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
// import chatRoutes from "./backend/routes/chat.js"; // lo activamos luego

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

// localhost para desarrollo
const localOrigins = [
  ...Array.from({ length: 30 }, (_, i) => `http://localhost:${5170 + i}`),
  ...Array.from({ length: 30 }, (_, i) => `http://127.0.0.1:${5170 + i}`),
];

// dominios declarados en entorno (Railway → FRONTEND_ORIGIN)
const envOrigins = (process.env.FRONTEND_ORIGIN || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// fallback por si FRONTEND_ORIGIN está vacío
const defaultProdOrigins = [
  "https://buholex.com",
  "https://www.buholex.com",
  "https://webbuholex-nuevo.vercel.app",
];

const allowedOrigins = Array.from(
  new Set([...localOrigins, ...envOrigins, ...defaultProdOrigins])
);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // Postman / curl
      if (allowedOrigins.includes(origin)) return cb(null, true);

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

// 🗣 Chat IA (cuando creemos backend/routes/chat.js)
// app.use("/api/chat", chatRoutes);

// ============================================================
// 🕒 Cargas opcionales SOLO en desarrollo/local
// ============================================================
//
// Estos son procesos pesados (cron scraping, mantenimiento índices, logs)
// que NO están subidos a GitHub porque están ignorados (.gitignore).
// Si intentamos importarlos en producción, Railway revienta.
// Solución: cargarlos solo si existen y solo fuera de production.
//

async function cargarTareasOpcionales() {
  if (NODE_ENV === "production") {
    console.log(chalk.gray("⏭ Saltando tareas internas (cron / maintain-indexes) en producción"));
    return;
  }

  // cleanupLogs, jobNoticias, maintainIndexes solo se intentan en dev/local
  try {
    const { cleanupLogs } = await import("./backend/jobs/cleanupLogs.js");
    const { jobNoticias } = await import("./backend/jobs/cronNoticias.js");
    console.log(chalk.gray("🧹 cleanupLogs y jobNoticias cargados en entorno no productivo"));

    // si quieres programar cron aquí en local:
    // import cron from "node-cron";
    // cron.schedule("0 */3 * * *", jobNoticias); // cada 3 horas por ejemplo
    // cron.schedule("0 0 * * *", cleanupLogs); // cada medianoche
  } catch (err) {
    console.warn(
      chalk.yellow(
        "⚠️ No se pudieron cargar cleanupLogs/cronNoticias (esto es normal si estás en producción o si faltan esos archivos)",
        err.message
      )
    );
  }

  try {
    const { maintainIndexes } = await import("./scripts/maintain-indexes.js");
    if (typeof maintainIndexes === "function") {
      console.log(chalk.gray("🛠 Ejecutando maintainIndexes() en entorno no productivo..."));
      await maintainIndexes();
    }
  } catch (err) {
    console.warn(
      chalk.yellow(
        "⚠️ maintain-indexes.js no disponible (ignorado en repo o estás en producción)",
        err.message
      )
    );
  }
}

// ============================================================
// 🧠 Conexión y arranque del servidor
// ============================================================

(async () => {
  try {
    console.log(chalk.yellowBright("\n⏳ Intentando conectar a MongoDB Atlas..."));
    await connectDB();
    console.log(chalk.greenBright("✅ Conexión establecida correctamente."));

    // Cargamos las tareas opcionales solo en entorno no productivo
    await cargarTareasOpcionales();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(chalk.greenBright(`\n🚀 Servidor BúhoLex corriendo en puerto ${PORT}`));
      console.log(chalk.cyanBright("🌍 Orígenes permitidos por CORS:"));
      allowedOrigins.forEach((o) => console.log("   ", chalk.gray("-", o)));
    });
  } catch (err) {
    console.error(chalk.red("❌ Error crítico al iniciar servidor:"), err.message);
    process.exit(1);
  }
})();
