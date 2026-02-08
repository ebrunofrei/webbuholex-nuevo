// ============================================================================
// 🗣️ interpretTool — Canonical Interpreter (Audio / Video / Text)
// ----------------------------------------------------------------------------
// - voice / video / text
// - forense: transcripción cruda + segments
// - no forense: translate + normalize
// - sin persistencia
// - contrato estable
// ============================================================================

import { transcribeAudio } from "./transcribeAudio.js";
import { translateText } from "../tools/translateText.js";
import { normalizeLegalText } from "../tools/normalizeLegalText.js";

export async function interpretTool(req, res) {
  const startedAt = Date.now();

  try {
    // --------------------------------------------------
    // Input
    // --------------------------------------------------
    const {
      inputType,
      audioBase64,
      videoBase64,
      text,
      sourceLang = "auto",
      targetLang = "en",
      mode = "legal",
      sessionId = null,
    } = req.body || {};

    // Logs útiles (puedes borrar luego)
    console.log("[interpretTool] inputType:", inputType);
    console.log("[interpretTool] has audio:", typeof audioBase64 === "string");
    console.log("[interpretTool] has video:", typeof videoBase64 === "string");

    // --------------------------------------------------
    // Validación mínima
    // --------------------------------------------------
    if (!["voice", "video", "text"].includes(inputType)) {
      return res.json({ ok: false, error: "Tipo de entrada inválido" });
    }

    let originalText = "";
    let segments = [];

    // --------------------------------------------------
    // 🎙️ INPUT: VOICE / VIDEO
    // --------------------------------------------------
    if (inputType === "voice" || inputType === "video") {
      let finalAudioBase64 = null;

      // ---- VOICE ----
      if (inputType === "voice") {
        if (typeof audioBase64 !== "string" || !audioBase64) {
          return res.json({ ok: false, error: "Audio inválido o vacío" });
        }
        finalAudioBase64 = audioBase64;
      }

      // ---- VIDEO ----
      if (inputType === "video") {
        if (typeof videoBase64 !== "string" || !videoBase64) {
          return res.json({ ok: false, error: "Video inválido o vacío" });
        }

        finalAudioBase64 = await extractAudioFromVideo(videoBase64);

        console.log(
          "[extractAudioFromVideo] result:",
          typeof finalAudioBase64,
          finalAudioBase64?.length
        );

        if (typeof finalAudioBase64 !== "string" || !finalAudioBase64) {
          return res.json({
            ok: false,
            error: "No se pudo extraer audio del video",
          });
        }
      }

      // ---- STT ----
      const sttResult = await transcribeAudio({
        audioBase64: finalAudioBase64,
        forense: mode === "forense",
      });

      if (!sttResult || typeof sttResult.text !== "string") {
        return res.json({ ok: false, error: "Transcripción vacía" });
      }

      originalText = sttResult.text.trim();
      segments = Array.isArray(sttResult.segments)
        ? sttResult.segments
        : [];
    }

    // --------------------------------------------------
    // 📝 INPUT: TEXT
    // --------------------------------------------------
    if (inputType === "text") {
      if (typeof text !== "string" || !text.trim()) {
        return res.json({ ok: false, error: "Texto inválido o vacío" });
      }
      originalText = text.trim();
    }

    if (!originalText) {
      return res.json({ ok: false, error: "Sin texto interpretable" });
    }

    // --------------------------------------------------
    // 🔎 MODO FORENSE — SALIDA DIRECTA
    // --------------------------------------------------
    if (mode === "forense") {
      return res.json({
        ok: true,
        originalText,
        segments,
        metadata: {
          mode: "forense",
          input: inputType,
          sessionId,
          durationMs: Date.now() - startedAt,
        },
      });
    }

    // --------------------------------------------------
    // 🌐 MODOS NO FORENSES
    // --------------------------------------------------
    const translatedText = await translateText({
      text: originalText,
      sourceLang,
      targetLang,
    });

    const normalizedText = await normalizeLegalText({
      text: translatedText,
      mode,
    });

    // --------------------------------------------------
    // 📤 RESPUESTA FINAL
    // --------------------------------------------------
    return res.json({
      ok: true,
      originalText,
      translatedText,
      normalizedText,
      metadata: {
        mode,
        input: inputType,
        sessionId,
        durationMs: Date.now() - startedAt,
      },
    });

  } catch (err) {
    console.error("[interpretTool] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err?.message || "Error procesando interpretación",
    });
  }
}
