import express from "express";
import { generarVozVaronil } from "../services/ttsService.js";
import path from "path";

const router = express.Router();

router.post("/voz", async (req, res) => {
  try {
    const { texto } = req.body;
    if (!texto) return res.status(400).json({ error: "Texto requerido" });

    const archivo = path.resolve("./voz.mp3");
    await generarVozVaronil(texto, archivo);

    res.setHeader("Content-Type", "audio/mpeg");
    res.sendFile(archivo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
