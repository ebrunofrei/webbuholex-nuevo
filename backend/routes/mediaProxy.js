// backend/routes/mediaProxy.js
import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fallbackPath = path.join(__dirname, "../public/assets/default-news.jpg");

/**
 * Proxy de imágenes externas (evita bloqueos por CORS o 403)
 * Ejemplo: /api/media?url=https://sitio.com/imagen.png
 */
router.get("/", async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || !/^https?:\/\//i.test(url)) {
      // 🔸 Si no hay URL válida, devuelve imagen local
      return res.sendFile(fallbackPath);
    }

    // Solicitud con headers para evitar bloqueos por hotlink
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BuholexBot/1.0)",
        Referer: "https://buholex.com",
        "Accept": "image/*",
      },
    });

    if (!response.ok) {
      console.warn(`⚠️ Imagen no accesible (${response.status}): ${url}`);
      return res.sendFile(fallbackPath);
    }

    // ✅ Devuelve la imagen remota correctamente
    res.set("Content-Type", response.headers.get("content-type") || "image/jpeg");
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error("❌ Error en /api/media:", err.message);
    // 🔁 Si hay error, usa imagen por defecto
    res.sendFile(fallbackPath);
  }
});

export default router;
