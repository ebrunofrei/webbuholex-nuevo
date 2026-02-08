// ============================================================================
// 🧪 Forensic Upload Controller — CANONICAL & DEFENSIVE
// ----------------------------------------------------------------------------
// • Acepta audio y video (tolerante a MIME defectuoso)
// • Extrae audio solo si es video
// • Segmenta por tiempo (streams largos)
// • STT puro (sin interpretación)
// • Cadena de custodia verificable
// • Limpieza garantizada (finally)
// ============================================================================

import fs from "fs";
import path from "path";
import crypto from "crypto";

import { extractAudioIfNeeded, segmentAudio } from "./ffmpegAudio.js";
import { transcribeChunks } from "./sttChunks.js";
import { cleanupFiles } from "./cleanup.js";
import { detectAudioCuts } from "./ffmpegAudio.js";

// ---------------------------------------------------------------------------
// 🧱 Constantes canónicas
// ---------------------------------------------------------------------------
const AUDIO_EXTENSIONS = [".mp3", ".wav", ".m4a", ".aac", ".ogg"];
const VIDEO_EXTENSIONS = [".mp4", ".mov", ".mkv", ".webm"];
const SEGMENT_SECONDS = 600; // 10 min (forense-safe)

// ---------------------------------------------------------------------------
// 🎯 Controller
// ---------------------------------------------------------------------------
export async function forensicUploadController(req, res) {
  const startedAt = Date.now();
  const file = req.file;

  let audioPath = null;
  let chunks = [];

  // -------------------------------------------------------------------------
  // 1️⃣ Validación mínima dura
  // -------------------------------------------------------------------------
  if (!file?.path) {
    return res.status(400).json({
      ok: false,
      error: "Archivo no recibido",
    });
  }

  const originalName = file.originalname || "unknown";
  const mime = file.mimetype || "unknown";
  const extension = path.extname(originalName).toLowerCase();

  // -------------------------------------------------------------------------
  // 2️⃣ Detección DEFENSIVA de tipo real
  // -------------------------------------------------------------------------
  const isAudio =
    mime.startsWith("audio/") || AUDIO_EXTENSIONS.includes(extension);

  const isVideo =
    mime.startsWith("video/") || VIDEO_EXTENSIONS.includes(extension);

  if (!isAudio && !isVideo) {
    await cleanupFiles([file.path]);
    return res.status(415).json({
      ok: false,
      error: `Formato no soportado (${mime} | ${extension || "sin-ext"})`,
    });
  }

  try {
    // -----------------------------------------------------------------------
    // 3️⃣ Hash SHA-256 — archivo ORIGINAL (cadena de custodia)
    // -----------------------------------------------------------------------
    const sha256 = await sha256File(file.path);

    // -----------------------------------------------------------------------
    // 4️⃣ Extracción de audio (solo si es video)
    // -----------------------------------------------------------------------
    audioPath = await extractAudioIfNeeded(file.path, isVideo);

    // -----------------------------------------------------------------------
    // 5️⃣ Segmentación por TIEMPO (forense)
    // -----------------------------------------------------------------------
    chunks = await segmentAudio(audioPath, SEGMENT_SECONDS);

    if (!Array.isArray(chunks) || chunks.length === 0) {
      throw new Error("No se generaron segmentos de audio");
    }

    // -----------------------------------------------------------------------
    // 🔍 Detección de cortes / ediciones (NO interpretativo)
    // -----------------------------------------------------------------------
    const audioCutSignals = await detectAudioCuts(audioPath);

    // -----------------------------------------------------------------------
    // 6️⃣ STT — TEXTO CRUDO (SIN INTERPRETACIÓN)
    // -----------------------------------------------------------------------
    const { text, segments } = await transcribeChunks(chunks);

    // -----------------------------------------------------------------------
    // 7️⃣ Respuesta forense final
    // -----------------------------------------------------------------------
    return res.json({
    ok: true,
    originalText: text,
    segments,
    forensicSignals: {
        audioCuts: audioCutSignals,
        suspiciousEdits: audioCutSignals.length > 0,
    },
    custody: {
        fileName: originalName,
        mime,
        extension,
        sha256,
        engine: "stt",
        forense: true,
        createdAt: new Date().toISOString(),
    },
    metadata: {
        durationMs: Date.now() - startedAt,
        chunks: chunks.length,
    },
    });

  } catch (error) {
    console.error("[forensicUpload] ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: error.message || "Error forense",
    });

  } finally {
    // -----------------------------------------------------------------------
    // 8️⃣ Limpieza SIEMPRE (garantizada)
    // -----------------------------------------------------------------------
    const filesToClean = [
      file?.path,
      audioPath,
      ...(Array.isArray(chunks) ? chunks : []),
    ].filter(Boolean);

    await cleanupFiles(filesToClean);
  }
}

// ---------------------------------------------------------------------------
// 🧰 Utils — Hash SHA-256 por stream (memory-safe)
// ---------------------------------------------------------------------------
function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);

    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}
