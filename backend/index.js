import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// =======================
// Rutas
// =======================
import whatsappRoutes from "./routes/whatsapp.js";
import iaRoutes from "./routes/ia.js"; // 👈 corregido (antes litisbot)
import notificacionesRoutes from "./routes/notificaciones.js";
import culqiRoutes from "./routes/culqi.js";
import usuariosRoutes from "./routes/usuarios.js";
import noticiasRoutes from "./routes/noticias.js";

// ⚠️ Ruta de scraping (opcional)
let scrapingRoutes = null;
try {
  scrapingRoutes = (await import("./routes/scraping.js")).default;
} catch {
  console.warn("ℹ️ /routes/scraping.js no encontrado, se omite esa ruta");
}

// =======================
// Cron jobs
// =======================
import { cleanupLogs } from "./jobs/cleanupLogs.js";
import { cronNoticias } from "./jobs/cronNoticias.js";

// =======================
// Config / App
// =======================
dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;

// =======================
// CORS seguro
// =======================
const defaultOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://webbuholex-nuevo.vercel.app",
  "https://www.buholex.com",
  "https://buholex.com",
];

const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((s) => s.trim())
  : defaultOrigins;

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // permite Postman, curl, Railway health
      if (corsOrigins.includes(origin)) return callback(null, true);
      console.warn("❌ Bloqueado por CORS:", origin);
      return callback(new Error("No permitido por CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Manejo explícito de preflight
app.options("*", cors());

// =======================
// Middlewares
// =======================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// =======================
// Rutas API
// =======================
app.use("/api/whatsapp", whatsappRoutes);
app.use("/api/ia", iaRoutes); // 👈 corregido aquí
app.use("/api/notificaciones", notificacionesRoutes);
if (scrapingRoutes) app.use("/api/scraping", scrapingRoutes);
app.use("/api/culqi", culqiRoutes);
app.use("/api/usuarios", usuariosRoutes);

// ✅ Noticias (jurídicas + generales)
app.use("/api/noticias", noticiasRoutes);

// Healthcheck
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    uptime: process.uptime(),
    env: process.env.NODE_ENV || "development",
    message: "✅ Backend operativo",
  });
});

// Archivos estáticos (ej: uploads)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// =======================
// Arranque del servidor
// =======================
app.listen(PORT, () => {
  console.log(`🚀 Backend escuchando en puerto ${PORT}`);
  console.log("🌍 Orígenes permitidos por CORS:", corsOrigins);
});

// =======================
// Cron jobs (ejecutados al inicio)
// =======================
cleanupLogs?.();
cronNoticias?.();

// =======================
// Rutas de prueba (solo en local)
// =======================
if (process.env.NODE_ENV !== "production") {
  app.get("/api/test/cleanup", async (_req, res) => {
    try {
      await cleanupLogs();
      res.json({ ok: true, message: "🧹 Cleanup ejecutado manualmente" });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/api/test/noticias", async (_req, res) => {
    try {
      await cronNoticias();
      res.json({ ok: true, message: "📰 CronNoticias ejecutado manualmente" });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });
}
