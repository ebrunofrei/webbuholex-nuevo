// index.js (buholex-backend-nuevo)
import { db, auth, admin } from "./services/firebaseAdmin.js"; // se importa una vez
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";

// Routers
import whatsappRouter from "./routes/whatsapp.js";
import notificaciones from "./routes/notificaciones.js";
import litisbot from "./routes/litisbot.js";
import memory from "./routes/memory.js";
import scraping from "./routes/scraping.js";
import elperuano from "./routes/elperuano.js";
import culqiRoutes from "./routes/culqi.js";
import userRoutes from "./routes/user.js";
import noticiasRouter from "./routes/noticias.js";

// Handler IA
import iaLitisBotChat from "./api/ia-litisbotchat.js";

// 1) Carga .env
dotenv.config();

// 2) App
const app = express();
// Vercel / proxies
app.set("trust proxy", 1);

// 3) CORS dinámico (desde .env y con comodín *.vercel.app)
const envOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Defaults útiles si no se define CORS_ORIGINS
const defaultOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1",
  "http://localhost:3000",
  "https://buholex.com",
  "https://www.buholex.com",
];

const allowList = new Set([...defaultOrigins, ...envOrigins]);
const vercelRegex = /\.vercel\.app$/i;

const corsOptions = {
  origin(origin, cb) {
    // Requests sin "Origin" (curl, server-to-server) -> permitir
    if (!origin) return cb(null, true);
    let host = "";
    try {
      host = new URL(origin).hostname;
    } catch {
      // Si no es una URL válida, negar
      return cb(new Error(`CORS origin inválido: ${origin}`));
    }
    const allowed = allowList.has(origin) || vercelRegex.test(host);
    return allowed ? cb(null, true) : cb(new Error(`CORS no permitido: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
};

app.use(cors(corsOptions));
// Preflight explícito
app.options("*", cors(corsOptions));

// 4) Middlewares
app.use(express.json({ limit: "3mb" }));
app.use(bodyParser.json({ limit: "3mb" }));

// 5) Rutas
app.use("/api/notificaciones", notificaciones);
app.use("/api/litisbot", litisbot);
app.use("/api/litisbot-memory", memory);
app.use("/api/buscar-fuente-legal", scraping);
app.use("/api/buscar-elperuano", elperuano);
app.use("/api/culqi", culqiRoutes);
app.use("/api/user", userRoutes);
app.use("/api", whatsappRouter);
app.use("/api", noticiasRouter);

// 6) Ruta directa para IA LitisBot Chat (POST)
app.post("/api/ia-litisbotchat", iaLitisBotChat);

// 7) Health / raíz
app.get("/", (_req, res) => {
  res.send("🦉 LitisBot backend API está corriendo.");
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || "development" });
});

// 8) 404 básico para /api
app.use("/api/*", (_req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// 9) Levanta el servidor
const PORT = process.env.PORT || 3001;
const server = app
  .listen(PORT, () => {
    console.log(`✅ LitisBot backend running at ${PORT}`);
    if (allowList.size) {
      console.log("🌐 CORS allowList:", Array.from(allowList).join(", "));
    }
    console.log("🌐 CORS adicional: *.vercel.app");
  })
  .on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`❌ El puerto ${PORT} ya está en uso`);
      process.exit(1);
    } else {
      throw err;
    }
  });

export default server;
