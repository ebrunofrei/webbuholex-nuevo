// api/transcribir-video.js
import { db, auth, storage } from "#services/myFirebaseAdmin.js";
import fs from "fs";
import multer from "multer";
import ffmpegPath from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
import fetch from "node-fetch";
import FormData from "form-data";

// Configurar ffmpeg
ffmpeg.setFfmpegPath(ffmpegPath);

// Configuración de Multer (archivos temporales en /tmp)
const upload = multer({ dest: "/tmp" });

/**
 * 📌 Handler para transcribir audio desde un video con Whisper
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res
      .status(405)
      .json({ success: false, error: "Método no permitido. Usa POST." });
  }

  try {
    // --- Validación de archivo recibido ---
    const video = req.file || req.files?.video;
    if (!video) {
      return res
        .status(400)
        .json({ success: false, error: "No se recibió el archivo de video." });
    }

    // --- Extraer audio en formato MP3 ---
    const audioPath = `/tmp/${Date.now()}-audio.mp3`;

    await new Promise((resolve, reject) => {
      ffmpeg(video.path)
        .audioCodec("libmp3lame")
        .toFormat("mp3")
        .on("end", resolve)
        .on("error", reject)
        .save(audioPath);
    });

    // --- Enviar el audio a Whisper (OpenAI) ---
    const form = new FormData();
    form.append("file", fs.createReadStream(audioPath));
    form.append("model", "whisper-1");
    form.append("response_format", "json");

    const whisperRes = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: form,
      }
    );

    const data = await whisperRes.json();

    // --- Limpieza de archivos temporales ---
    try {
      fs.unlinkSync(audioPath);
      fs.unlinkSync(video.path);
    } catch (e) {
      console.warn("⚠️ Error limpiando archivos temporales:", e.message);
    }

    if (!whisperRes.ok) {
      console.error("❌ Error en Whisper:", data);
      return res.status(502).json({
        success: false,
        error: data.error?.message || "Error en servicio de transcripción.",
      });
    }

    return res.status(200).json({
      success: true,
      texto: data.text || "",
    });
  } catch (error) {
    console.error("🔥 Error en transcribir-video:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Error interno al transcribir video.",
    });
  }
}

// 👉 Si usas Express:
// import express from "express";
// const router = express.Router();
// router.post("/api/transcribir-video", upload.single("video"), handler);
// export default router;
