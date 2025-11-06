// 1) Cargar .env.local ANTES de importar connectDB
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "..", ".env.local") }); // ← raíz

// 2) Recién aquí importa el driver y modelos
import { connectDB, disconnectDB } from "../backend/services/db.js";
import Noticia from "../backend/models/Noticia.js";

try {
  await connectDB();
  const total = await Noticia.countDocuments();
  console.log("Total noticias:", total);
  await disconnectDB();
  process.exit(0);
} catch (e) {
  console.error("db-test error:", e);
  try { await disconnectDB(); } catch {}
  process.exit(1);
}
