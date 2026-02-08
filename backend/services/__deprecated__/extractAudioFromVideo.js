// ============================================================================
// 🎞️ extractAudioFromVideo — Canonical (Windows-safe / Portable)
// ----------------------------------------------------------------------------
// - Usa ffmpeg-static (NO depende del sistema)
// - Extrae audio mono 16kHz (ideal para Whisper)
// - Devuelve audio en base64
// ============================================================================

import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";

ffmpeg.setFfmpegPath(ffmpegPath);

export async function extractAudioFromVideo(videoBase64) {
  if (typeof videoBase64 !== "string" || !videoBase64) {
    throw new Error("Video base64 inválido");
  }

  const tmpId = crypto.randomUUID();
  const tmpDir = os.tmpdir();

  const videoPath = path.join(tmpDir, `${tmpId}.mp4`);
  const audioPath = path.join(tmpDir, `${tmpId}.wav`);

  try {
    // Guardar video temporal
    fs.writeFileSync(videoPath, Buffer.from(videoBase64, "base64"));

    // Extraer audio
    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .noVideo()
        .audioChannels(1)
        .audioFrequency(16000)
        .audioCodec("pcm_s16le")
        .format("wav")
        .on("end", resolve)
        .on("error", reject)
        .save(audioPath);
    });

    const audioBuffer = fs.readFileSync(audioPath);
    const audioBase64 = audioBuffer.toString("base64");

    if (!audioBase64 || audioBase64.length < 1000) {
      throw new Error("Audio extraído inválido");
    }

    return audioBase64;

  } finally {
    // Limpieza
    if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
    if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
  }
}
