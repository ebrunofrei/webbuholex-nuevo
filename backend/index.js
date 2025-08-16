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
app.use(cors());
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
app.post("/api/ia-litisbotchat", iaLitisBotChat); // <-- ¡Clave!

// 7. Endpoint raíz (opcional)
app.get("/", (req, res) => {
  res.send("LitisBot backend API 🦉 está corriendo.");
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

