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
import newsTopics from "./backend/routes/news-topics.js";
import iaRouter from "./backend/routes/ia/index.js";
import chatSessionsRoutes from "./backend/routes/chatSessions.routes.js";
import usuariosRoutes from "./backend/routes/usuarios.js";
import culqiRoutes from "./backend/routes/culqi.js";
import notificacionesRoutes from "./backend/routes/notificaciones.js";
import noticiasGuardadasRoutes from "./backend/routes/noticiasGuardadas.js";
import traducirRoutes from "./backend/routes/traducir.js";
import vozRoutes from "./backend/routes/voz.js";
import newsLiveRouter from "./backend/routes/news-live.js";
import mediaRoutes from "./backend/routes/media.js";
import researchRoutes from "./backend/routes/research.js";
import jurisprudenciaRoutes from "./backend/routes/jurisprudencia.js";
import jurisprudenciaEmbedRoutes from "./backend/routes/jurisprudenciaEmbed.js";
import { startCronJurisprudencia } from "./backend/jobs/cronJurisprudencia.js";
import exportRouter from "./backend/routes/export.js";
import uploadRouter from "./backend/routes/uploads.js";
import pdfContextRouter from "./backend/routes/pdfContext.js";
import fuentesLegalesRouter from "./backend/routes/fuentesLegales.js";
import knowledgeRoutes from "./backend/routes/knowledge.js";
import timeRoutes from "./backend/routes/time.js";
import plazosRoutes from "./backend/routes/plazos.js";
import agendaRoutes from "./backend/routes/agenda.js";
import agendaEventosRouter from "./backend/routes/agendaEventos.js";
import agendaAlertsRouter from "./backend/routes/agendaAlerts.js";
import whatsappRoutes from "./backend/routes/whatsapp.js";
import casesRouter from "./backend/routes/cases.js";
import casesAuditRoutes from "./backend/routes/casesAudit.js";
import casesExportRoutes from "./backend/routes/casesExport.js";
import actionsRoutes from "./backend/routes/actions.js";
import draftsRoutes from "./backend/routes/drafts.js";
import analysesRouter from "./backend/routes/analyses.js";
import analysisMessagesRouter from "./backend/routes/analysisMessages.js";
import ocrRoutes from "./backend/routes/ocr.routes.js";
import toolsRoutes from "./backend/routes/tools.js";
import forenseRoutes from "./backend/routes/forense.routes.js";
import chatMessagesRouter from "./backend/routes/chatMessages.js";
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
console.log("Pinecone ENV:", {
  apiKey: process.env.PINECONE_API_KEY ? true : false,
  index: process.env.PINECONE_INDEX || "NO INDEX"
});

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

// Servir DOCX / PDF generados
app.use(
  "/exports",
  express.static(path.join(__dirname, "backend", "tmp_exports"))
);

// ============================================================
// 🔒 CORS (antes de montar rutas)
// ============================================================

const localOrigins = [
  ...Array.from({ length: 30 }, (_, i) => `http://localhost:${5170 + i}`),
  ...Array.from({ length: 30 }, (_, i) => `http://127.0.0.1:${5170 + i}`),
];

const envOrigins = (process.env.FRONTEND_ORIGIN || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const defaultProdOrigins = [
  "https://buholex.com",
  "https://www.buholex.com",
  "https://api.buholex.com",
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
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
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
// ===============================
// 🧪 RUTAS TEST (blindadas por flag)
// ===============================

const ENABLE_TEST_ROUTES = process.env.ENABLE_TEST_ROUTES === "true";

if (ENABLE_TEST_ROUTES && NODE_ENV !== "production") {
  (async () => {
    try {
      const { default: casesAuditTestRoutes } = await import(
        "./backend/routes/test/casesAudit.test.js"
      );

      app.use("/api/test", casesAuditTestRoutes);

      console.log("🧪 Rutas TEST de auditoría ACTIVADAS");
    } catch (err) {
      console.warn(
        "⚠️ No se cargaron rutas TEST:",
        err.message
      );
    }
  })();
} else {
  console.log("🛡️ Rutas TEST deshabilitadas (entorno protegido)");
}

// Salud
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

// ============================================================
// 🧩 RUTAS API PRINCIPALES (ORDEN CANÓNICO)
// ============================================================

/* ============================================================
   📰 CONTENIDO / NOTICIAS (público)
============================================================ */
app.use("/api/noticias/contenido", noticiasContenidoRoutes); // específico primero
app.use("/api/news", newsLiveRouter);                        // live primero
app.use("/api/news", newsTopics);
app.use("/api/noticias", noticiasRoutes);
app.use("/api/noticias-guardadas", noticiasGuardadasRoutes);

/* ============================================================
   🧠 IA / PROCESAMIENTO
============================================================ */
app.use("/api/ia", iaRouter);
app.use("/api/chat-sessions", chatSessionsRoutes);
app.use("/api/traducir", traducirRoutes);
app.use("/api/voz", vozRoutes);
app.use("/api/research", researchRoutes);
app.use("/api/ocr", ocrRoutes);
app.use("/api/tools", toolsRoutes);
app.use("/api/forense", forenseRoutes);
app.use("/api/chat-messages", chatMessagesRouter);

/* ============================================================
   📚 CONOCIMIENTO JURÍDICO / DOCUMENTOS
============================================================ */
app.use("/api/jurisprudencia", jurisprudenciaRoutes);
app.use("/api/jurisprudencia/embed", jurisprudenciaEmbedRoutes);
app.use("/api/fuentes-legales", fuentesLegalesRouter);
app.use("/api/knowledge", knowledgeRoutes);
app.use("/api/pdf", pdfContextRouter);
app.use("/api", exportRouter);
app.use("/api", uploadRouter);
app.use("/api/media", mediaRoutes);

/* ============================================================
   ⏱️ TIEMPO / AGENDA / PLAZOS
============================================================ */
app.use("/api/time", timeRoutes);
app.use("/api/plazos", plazosRoutes);
app.use("/api/agenda", agendaRoutes);
app.use("/api/agenda-eventos", agendaEventosRouter);
app.use("/api/agenda/alerts", agendaAlertsRouter);

/* ============================================================
   💬 COMUNICACIONES
============================================================ */
app.use("/api/whatsapp", whatsappRoutes);
app.use("/api/notificaciones", notificacionesRoutes);

/* ============================================================
   🏛️ DOMINIO JURÍDICO NÚCLEO (CANÓNICO)
============================================================ */
app.use("/api/cases", casesRouter);                 // CONTEXTOS
app.use("/api/analyses", analysesRouter);           // ANÁLISIS
app.use("/api/analyses", analysisMessagesRouter);
app.use("/api/cases/audit", casesAuditRoutes);      // AUDITORÍA
app.use("/api/cases/export", casesExportRoutes);    // EXPORTACIONES

/* ============================================================
   🛠️ ACCIONES AUXILIARES
============================================================ */
app.use("/api/actions", actionsRoutes);
app.use("/api/drafts", draftsRoutes);

/* ============================================================
   ❌ 404 SOLO PARA /api
============================================================ */
app.use("/api", (_req, res) =>
  res.status(404).json({ ok: false, error: "Ruta no encontrada" })
);

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

}

// ============================================================
// 🚀 Arranque del servidor (una sola conexión a Mongo)
// ============================================================

export { app };

if (process.env.NODE_ENV !== "test") {
  (async () => {
    try {
      console.log(chalk.yellowBright("\n⏳ Intentando conectar a MongoDB Atlas..."));
      const uri = process.env.MONGODB_URI || getMongoUri();
      await dbConnect(uri);                       // ✅ usar dbConnect (nombre real)
      console.log(chalk.greenBright("✅ Conexión establecida correctamente."));

      await cargarTareasOpcionales();

      const server = app.listen(PORT, "0.0.0.0", () => {
        console.log(chalk.greenBright(`\n🚀 Servidor BúhoLex corriendo en puerto ${PORT}`));
        console.log(chalk.cyanBright("🌍 Orígenes permitidos por CORS:"));
        allowedOrigins.forEach((o) => console.log("   ", chalk.gray("-", o)));
      });

      // timeouts que NO rompen streaming (chat/SSE si lo activas luego)
      server.keepAliveTimeout = 75_000;
      server.headersTimeout = 80_000;
    } catch (err) {
      console.error(chalk.red("❌ Error crítico al iniciar servidor:"), err.message);
      process.exit(1);
    }
  })();
}
