// index.js (buholex-backend-nuevo)

import express from "express";
import whatsappRouter from "./routes/whatsapp.js";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";

// 1. Carga variables de entorno .env
dotenv.config();

// 2. Importa routers personalizados (todos como ES Modules)
import notificaciones from "./routes/notificaciones.js";
import litisbot from "./routes/litisbot.js";
import memory from "./routes/memory.js";
import scraping from "./routes/scraping.js";
import elperuano from "./routes/elperuano.js";
import culqiRoutes from "./routes/culqi.js";
import userRoutes from "./routes/user.js";
import noticiasRouter from "./routes/noticias.js";

// 3. IMPORTA tu handler IA-litisbotchat directamente
import iaLitisBotChat from "./api/ia-litisbotchat.js";

// 4. Crea la app de Express
const app = express();

// --- Configuración avanzada de CORS ---
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://127.0.0.1",
    "https://buholex.com",
    "https://www.buholex.com",
    /\.vercel\.app$/ // cualquier subdominio *.vercel.app
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false
};
app.use(cors(corsOptions));

// Manejo explícito de preflight
app.options("*", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return res.sendStatus(204);
});

// --- Middlewares ---
app.use(express.json());
app.use(bodyParser.json({ limit: "3mb" }));

// 5. Rutas personalizadas
app.use("/api/notificaciones", notificaciones);
app.use("/api/litisbot", litisbot);
app.use("/api/litisbot-memory", memory);
app.use("/api/buscar-fuente-legal", scraping);
app.use("/api/buscar-elperuano", elperuano);
app.use("/api/culqi", culqiRoutes);
app.use("/api/user", userRoutes);
app.use("/api", whatsappRouter);
app.use("/api", noticiasRouter);

// 6. NUEVA RUTA DIRECTA para IA LitisBot Chat (POST)
app.post("/api/ia-litisbotchat", iaLitisBotChat);

// 7. Endpoint raíz (opcional)
app.get("/", (req, res) => {
  res.send("🦉 LitisBot backend API está corriendo.");
});

// 8. Levanta el servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ LitisBot backend running at ${PORT}`);
}).on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ El puerto ${PORT} ya está en uso`);
    process.exit(1); // evita crash constante
  } else {
    throw err;
  }
});
