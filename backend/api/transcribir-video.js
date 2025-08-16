import fs from "fs";
import path from "path";
import multer from "multer";
import ffmpegPath from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
import fetch from "node-fetch";
import FormData from "form-data";

// Configura ffmpeg
ffmpeg.setFfmpegPath(ffmpegPath);

// Multer para archivos temporales (si usas Express)
const upload = multer({ dest: "/tmp" });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Solo POST permitido" });
  }

  // Recibe el archivo de video
  const video = req.file || req.files?.video;
  if (!video) return res.status(400).json({ error: "No se recibió el archivo" });

  // Extrae el audio a un archivo temporal .mp3
  const audioPath = `/tmp/${Date.now()}-audio.mp3`;

  await new Promise((resolve, reject) => {
    ffmpeg(video.path)
      .audioCodec("libmp3lame")
      .toFormat("mp3")
      .on("end", resolve)
      .on("error", reject)
      .save(audioPath);
  });

  // Envía el audio a Whisper (OpenAI)
  const form = new FormData();
  form.append("file", fs.createReadStream(audioPath));
  form.append("model", "whisper-1");

  const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${process.env.OPENAI_KEY}` },
    body: form,
  });
  const data = await whisperRes.json();

  // Limpieza
  fs.unlinkSync(audioPath);
  fs.unlinkSync(video.path);

  // Devuelve la transcripción
  res.status(200).json({ texto: data.text || data.error?.message });
}

// Si usas Express:
// router.post("/api/transcribir-video", upload.single("video"), handler);
