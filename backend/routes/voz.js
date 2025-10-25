// backend/routes/voz.js
import express from "express";
import path from "path";
import { generarVozVaronil } from "../services/ttsService.js";

const router = express.Router();

router.post("/voz", async (req, res) => {
  try {
    const { texto } = req.body || {};
    if (!texto || !texto.trim()) {
      return res.status(400).json({ error: "Texto requerido" });
    }

    const archivo = path.resolve("./voz.mp3");
    await generarVozVaronil(texto, archivo);

    res.setHeader("Content-Type", "audio/mpeg");
    return res.sendFile(archivo);
  } catch (err) {
    console.error("❌ /voz error:", err);
    return res.status(500).json({ error: "Error generando voz" });
  }
});

export default router;
