// ============================================================================
// 🎙️ transcribeAudio — Canonical STT (Forensic-ready) v2
// ----------------------------------------------------------------------------
// - Usa whisper-1
// - Convierte AUDIO → TEXTO CRUDO
// - Soporta:
//     • audioBase64 (legacy / compatibilidad)
//     • filePath (pipeline forense real)
// - En modo forense: devuelve segments con timestamps
// - NO normaliza
// - NO interpreta
// ============================================================================

import fs from "fs";
import path from "path";
import os from "os";
import { getOpenAIClient } from "../openaiService.js";

/**
 * @param {Object} params
 * @param {string=} params.audioBase64
 * @param {string=} params.filePath
 * @param {boolean=} params.forense
 */
export async function transcribeAudio({
  audioBase64,
  filePath,
  forense = false,
}) {
  // --------------------------------------------------
  // Validación estricta de entrada
  // --------------------------------------------------
  if (!audioBase64 && !filePath) {
    throw new Error("Debe proporcionarse audioBase64 o filePath");
  }

  if (audioBase64 && filePath) {
    throw new Error("Proporciona solo audioBase64 o filePath, no ambos");
  }

  const openai = getOpenAIClient();

  // --------------------------------------------------
  // Resolver archivo de entrada real
  // --------------------------------------------------
  let tmpPath = null;
  let cleanupTmp = false;

  if (filePath) {
    // pipeline moderno (forense)
    if (!fs.existsSync(filePath)) {
      throw new Error("Archivo de audio no existe");
    }
    tmpPath = filePath;
  } else {
    // compatibilidad legacy (base64)
    if (typeof audioBase64 !== "string") {
      throw new Error("audioBase64 inválido");
    }

    const buffer = Buffer.from(audioBase64, "base64");
    tmpPath = path.join(os.tmpdir(), `audio-${Date.now()}.wav`);
    fs.writeFileSync(tmpPath, buffer);
    cleanupTmp = true;
  }

  try {
    const result = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tmpPath),
      model: "whisper-1",
      response_format: forense ? "verbose_json" : "json",
    });

    if (!result || typeof result.text !== "string") {
      throw new Error("Transcripción vacía");
    }

    // --------------------------------------------------
    // MODO NORMAL (solo texto)
    // --------------------------------------------------
    if (!forense) {
      return { text: result.text };
    }

    // --------------------------------------------------
    // MODO FORENSE (texto + segmentos)
    // --------------------------------------------------
    const segments = Array.isArray(result.segments)
      ? result.segments.map((s, i) => ({
          index: i,
          start: Number(s.start ?? 0),
          end: Number(s.end ?? 0),
          text: String(s.text || "").trim(),
        }))
      : [];

    return {
      text: result.text,
      segments,
    };

  } finally {
    // limpieza defensiva SOLO si se creó temp
    if (cleanupTmp && tmpPath) {
      try {
        fs.unlinkSync(tmpPath);
      } catch {}
    }
  }
}
