// backend/index.js
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
import litisbotRoutes from "./routes/litisbot.js";
import notificacionesRoutes from "./routes/notificaciones.js";
import culqiRoutes from "./routes/culqi.js";
import usuariosRoutes from "./routes/usuarios.js";
import noticiasRoutes from "./routes/noticias.js";

// ⚠️ Ruta de scraping (opcional). Si no existe el archivo, no rompe el server.
let scrapingRoutes = null;
try {
  scrapingRoutes = (await import("./routes/scraping.js")).default;
} catch {
  console.warn("ℹ️ /routes/scraping.js no encontrado, se omite esa ruta");
}

// =======================
// Cron jobs (carpeta: jobs/)
// =======================
import { cleanupLogs } from "./jobs/cleanupLogs.js";
import { cronNoticias } from "./jobs/cronNoticias.js";

// =======================
// Config / App
// =======================
dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;

// CORS: admite lista separada por comas o '*'
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((s) => s.trim())
  : "*";

app.use(cors({ origin: corsOrigins }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// =======================
// Rutas API
// =======================
app.use("/api/whatsapp", whatsappRoutes);
app.use("/api/litisbot", litisbotRoutes);
app.use("/api/notificaciones", notificacionesRoutes);
if (scrapingRoutes) app.use("/api/scraping", scrapingRoutes); // solo si existe
app.use("/api/culqi", culqiRoutes);
app.use("/api/usuarios", usuariosRoutes);

// ✅ Noticias (jurídicas + generales)
app.use("/api/noticias", noticiasRoutes);

// Healthcheck (Railway/Vercel)
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    uptime: process.uptime(),
    env: process.env.NODE_ENV || "development",
    message: "✅ Backend operativo",
  });
});

// Archivos estáticos (si usas uploads)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// =======================
// Arranque del servidor
// =======================
app.listen(PORT, () => {
  console.log(`🚀 Backend escuchando en puerto ${PORT}`);
});

// =======================
// Cron jobs (ejecutados al inicio)
// =======================
cleanupLogs?.();
cronNoticias?.();

// =======================
// Rutas de prueba manual (solo en local)
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
