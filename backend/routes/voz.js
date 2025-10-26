import express from "express";
import { generarVozVaronil } from "../services/ttsService.js";

const router = express.Router();

/**
 * POST /voz
 * body: { texto: string }
 * Devuelve audio/mp3 (voz masculina profesional) generado a partir del texto.
 */
router.post("/voz", async (req, res) => {
  try {
    const { texto } = req.body || {};
    const limpio = (texto || "").trim();
    if (!limpio) {
      return res.status(400).json({
        error: "Texto requerido para síntesis de voz.",
      });
    }

    // generar el buffer MP3
    const audioBuffer = await generarVozVaronil(limpio);

    if (!audioBuffer || !audioBuffer.length) {
      console.error("⚠️ generarVozVaronil devolvió vacío");
      return res.status(500).json({
        error: "No se pudo generar voz en este momento.",
      });
    }

    // cabeceras correctas para reproducirlo directo en <audio> del browser
    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": audioBuffer.length,
      "Cache-Control": "no-store",
    });

    return res.send(audioBuffer);
  } catch (err) {
    console.error("❌ /voz error:", err);
    return res.status(500).json({ error: "Error generando voz" });
  }
});

export default router;
