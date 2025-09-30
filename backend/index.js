// backend/index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import whatsappRouter from "#routes/whatsapp.js";
import notificaciones from "#routes/notificaciones.js";
import litisbot from "#routes/litisbot.js";
import memory from "#routes/memory.js";
import scraping from "#routes/scraping.js";
import elperuano from "#routes/elperuano.js";
import culqiRoutes from "#routes/culqi.js";
import userRoutes from "#routes/user.js";
import noticiasRouter from "#routes/noticias.js";

import startCleanupLogs from "#jobs/cleanupLogs.js";
import startNoticiasCron from "#jobs/cronNoticias.js";

// === Configuración ===
dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas
app.use("/api/whatsapp", whatsappRouter);
app.use("/api/notificaciones", notificaciones);
app.use("/api/litisbot", litisbot);
app.use("/api/memory", memory);
app.use("/api/scraping", scraping);
app.use("/api/elperuano", elperuano);
app.use("/api/culqi", culqiRoutes);
app.use("/api/users", userRoutes);
app.use("/api/noticias", noticiasRouter);

// Healthcheck
app.get("/api/health", (_, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// Iniciar cron jobs
startCleanupLogs();
startNoticiasCron();

// Arranque del servidor
app.listen(PORT, () => {
  console.log(`🚀 Backend corriendo en http://localhost:${PORT}`);
});
