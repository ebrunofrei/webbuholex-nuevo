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

// Rutas y servicios principales
import pingRoutes from './backend/routes/ping.js';
import noticiasRoutes from "./backend/routes/noticias.js";
import noticiasContenidoRoutes from "./backend/routes/noticiasContenido.js";
import newsTopics from "./backend/routes/news-topics.js";
import iaRoutes from "./backend/routes/ia.js";
import usuariosRoutes from "./backend/routes/usuarios.js";
import culqiRoutes from "./backend/routes/culqi.js";
import notificacionesRoutes from "./backend/routes/notificaciones.js";
import noticiasGuardadasRoutes from "./backend/routes/noticiasGuardadas.js";
import traducirRoutes from "./backend/routes/traducir.js";
import vozRoutes from "./backend/routes/voz.js";
import newsLiveRoutes from "./backend/routes/news-live.js";
import mediaRoutes from "./backend/routes/media.js";
import researchRoutes from "./backend/routes/research.js";
import exportRoutes from "./backend/routes/export.js";

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
  console.warn(chalk.yellow(`⚠️ No se encontró ${envFile}, usando .env por defecto.`));
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
// 🚀 Inicialización de Express
// ============================================================

const app = express();
app.set("trust proxy", 1);

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Alive rápido
app.get("/alive", (_req, res) => res.type("text/plain").send("ok"));

// ============================================================
// 🔒 CORS (antes de montar rutas)
// ============================================================

const localPorts = Array.from({ length: 40 }, (_, i) => 5170 + i);
const localOrigins = [
  ...localPorts.map((p) => `http://localhost:${p}`),
  ...localPorts.map((p) => `http://127.0.0.1:${p}`),
  "http://localhost:4173",
  "http://127.0.0.1:4173",
];

const envOrigins = (process.env.FRONTEND_ORIGIN || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const defaultProdOrigins = [
  "https://buholex.com",
  "https://www.buholex.com",
  "https://webbuholex-nuevo.vercel.app",
];

const allowedOrigins = Array.from(new Set([...localOrigins, ...envOrigins, ...defaultProdOrigins]));

const corsDelegate = (origin, cb) => {
  if (!origin) return cb(null, true);
  if (allowedOrigins.includes(origin)) return cb(null, true);
  console.warn(chalk.yellow(`⚠️ [CORS] Bloqueado: ${origin}`));
  return cb(new Error(`CORS no permitido: ${origin}`));
};

app.use(
  cors({
    origin: corsDelegate,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    optionsSuccessStatus: 204,
  })
);

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
// 🩺 Endpoint de salud mejorado
// ============================================================

app.get("/api/health", (_req, res) => {
  const mongoState = mongoose.connection?.readyState ?? 0;
  const states = ["desconectado", "conectando", "conectado", "desconectando"];
  const mongoStatus = mongoState === 1 ? "✅ Conectado a MongoDB Atlas" : `⚠️ ${states[mongoState]}`;

  res.status(200).json({
    ok: mongoState === 1,
    entorno: NODE_ENV,
    version: process.env.npm_package_version || "1.0.0",
    mongo: mongoStatus,
    readyState: mongoState,
    openai: process.env.OPENAI_API_KEY ? "✅" : "❌",
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
  });
});

// ============================================================
// 🧩 Rutas API principales (orden específico)
// ============================================================

app.use("/api/noticias/contenido", noticiasContenidoRoutes);
app.use("/api/news", newsLiveRoutes);
app.use("/api/noticias", noticiasRoutes);
app.use("/api/noticias-guardadas", noticiasGuardadasRoutes);
app.use("/api/news", newsTopics);
app.use("/api/ia", iaRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/culqi", culqiRoutes);
app.use("/api/notificaciones", notificacionesRoutes);
app.use("/api/traducir", traducirRoutes);
app.use("/api/voz", vozRoutes);
app.use("/api/media", mediaRoutes);
app.use('/api', pingRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/research", researchRoutes);

// 404 JSON solo /api
app.get("/api/research/health-inline", (_req, res) => {
  res.json({ ok: true, inline: true });
});
app.use("/api", (_req, res) => res.status(404).json({ ok: false, error: "Ruta no encontrada" }));

// Debug: listar rutas montadas
function listRoutes(app) {
  console.log("🛣  Rutas montadas:");
  app._router.stack
    .filter((l) => l.route || l.name === 'router')
    .forEach((l) => {
      if (l.route?.path) {
        const methods = Object.keys(l.route.methods).join(",").toUpperCase();
        console.log(`  ${methods.padEnd(6)} ${l.route.path}`);
      } else if (l.name === 'router' && l.regexp) {
        // Sub-routers (como /api/research)
        const mountPath = l.regexp.toString().replace(/^\/\\\^\\\/|\\\/\?\(\?=\\\/\|\$\)\/i$/g, "/");
        console.log(`  <router> ${mountPath}`);
      }
    });
}

listRoutes(app);

// ============================================================
// 🕒 Cargas opcionales SOLO en desarrollo/local
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
// 🚀 Arranque del servidor (con conexión robusta a MongoDB)
// ============================================================

export { app };

if (process.env.NODE_ENV !== "test") {
  (async () => {
    const uri = process.env.MONGODB_URI;
    const MAX_TRIES = 6;

    console.log(chalk.yellowBright("\n⏳ Intentando conectar a MongoDB Atlas..."));

    let attempt = 0;
    while (attempt < MAX_TRIES) {
      try {
        await mongoose.connect(uri, {
          serverSelectionTimeoutMS: 5000,
          connectTimeoutMS: 8000,
          family: 4, // ✅ Fuerza IPv4
        });
        console.log(chalk.greenBright("✅ Conexión establecida correctamente."));
        break;
      } catch (err) {
        attempt++;
        const delay = Math.min(2000 * 2 ** (attempt - 1), 10000);
        console.warn(chalk.yellow(`⚠️ Fallo conexión Mongo (intento ${attempt}/${MAX_TRIES}): ${err.message}`));
        if (attempt >= MAX_TRIES) {
          console.error(chalk.red("❌ No se pudo conectar a MongoDB Atlas."));
          process.exit(1);
        }
        console.log(chalk.gray(`↻ Reintentando en ${delay} ms...`));
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    await cargarTareasOpcionales();

    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(chalk.greenBright(`\n🚀 Servidor BúhoLex corriendo en puerto ${PORT}`));
      console.log(chalk.cyanBright("🌍 Orígenes permitidos por CORS:"));
      allowedOrigins.forEach((o) => console.log("   ", chalk.gray("-", o)));
    });

    // timeouts que NO rompen streaming (chat/SSE)
    server.keepAliveTimeout = 75_000;
    server.headersTimeout = 80_000;
  })();
}
