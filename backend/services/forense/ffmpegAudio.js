import fs from "fs";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import ffmpegPath from "ffmpeg-static";

// ---------------------------------------------------------------------------
// 🔎 Validación dura
// ---------------------------------------------------------------------------
if (!ffmpegPath || !fs.existsSync(ffmpegPath)) {
  throw new Error(`FFmpeg no encontrado. Ruta resuelta: ${ffmpegPath}`);
}

// ---------------------------------------------------------------------------
// 🎧 Extraer audio si es video
// ---------------------------------------------------------------------------
export async function extractAudioIfNeeded(inputPath, isVideo) {
  if (!isVideo) return inputPath;

  const outPath = path.join(
    os.tmpdir(),
    `${Date.now()}-audio.wav`
  );

  await execFFmpeg([
    "-y",
    "-i", inputPath,
    "-ac", "1",
    "-ar", "16000",
    outPath,
  ]);

  return outPath;
}

// ---------------------------------------------------------------------------
// ✂️ Segmentación por TIEMPO (forense real)
// ---------------------------------------------------------------------------
export async function segmentAudio(audioPath, seconds = 600) {
  const dir = path.dirname(audioPath);
  const base = path.basename(audioPath, path.extname(audioPath));
  const pattern = path.join(dir, `${base}_chunk_%03d.wav`);

  await execFFmpeg([
    "-y",
    "-i", audioPath,
    "-ac", "1",
    "-ar", "16000",
    "-f", "segment",
    "-segment_time", String(seconds),
    pattern,
  ]);

  const files = fs.readdirSync(dir)
    .filter(f => f.startsWith(`${base}_chunk_`) && f.endsWith(".wav"))
    .map(f => path.join(dir, f));

  if (!files.length) {
    throw new Error("FFmpeg no generó segmentos de audio");
  }

  return files;
}

// ---------------------------------------------------------------------------
// 🧠 Ejecutor robusto (Windows / Railway / Docker)
// ---------------------------------------------------------------------------
function execFFmpeg(args) {
  return new Promise((resolve, reject) => {
    execFile(
      ffmpegPath,
      args,
      { windowsHide: true },
      (err, stdout, stderr) => {
        if (err) {
          reject(
            new Error(`FFmpeg falló:\n${stderr || err.message}`)
          );
        } else {
          resolve();
        }
      }
    );
  });
}
// ---------------------------------------------------------------------------
// 🔍 Detección de cortes / ediciones (silencios anómalos)
// - No interpreta contenido
// - Solo señales forenses
// ---------------------------------------------------------------------------
export async function detectAudioCuts(
  audioPath,
  silenceDb = -35,
  minDuration = 0.3
) {
  const events = [];

  await execFFmpegWithTrace(
    [
      "-i", audioPath,
      "-af", `silencedetect=noise=${silenceDb}dB:d=${minDuration}`,
      "-f", "null",
      "-"
    ],
    (line) => {
      if (line.includes("silence_start")) {
        const t = parseFloat(line.split("silence_start:")[1]);
        events.push({ type: "silence_start", at: t });
      }

      if (line.includes("silence_end")) {
        const t = parseFloat(line.split("silence_end:")[1]);
        events.push({ type: "silence_end", at: t });
      }
    }
  );

  return events;
}

// ---------------------------------------------------------------------------
// 🧠 Executor con traza STDERR (solo para análisis)
// NO reemplaza execFFmpeg
// ---------------------------------------------------------------------------
function execFFmpegWithTrace(args, onLine) {
  return new Promise((resolve, reject) => {
    const proc = execFile(
      ffmpegPath,
      args,
      { windowsHide: true },
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );

    if (proc.stderr && onLine) {
      proc.stderr.on("data", (chunk) => {
        chunk
          .toString()
          .split("\n")
          .forEach(line => onLine(line));
      });
    }
  });
}
