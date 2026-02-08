// ============================================================================
// 🧠 interpretTool — Canonical Text Interpreter
// ----------------------------------------------------------------------------
// - SOLO texto (ya transcrito)
// - forense: devuelve texto crudo + segments (si vienen)
// - no forense: translate + normalize
// - sin base64
// - sin ffmpeg
// - sin persistencia
// - contrato estable
// ============================================================================

import { translateText } from "./translateText.js";
import { normalizeLegalText } from "./normalizeLegalText.js";

export async function interpretTool(req, res) {
  const startedAt = Date.now();

  try {
    // --------------------------------------------------
    // Input (TEXTO PURO)
    // --------------------------------------------------
    const {
      inputType = "text",      // "text" | "forense"
      text,
      segments = [],           // opcional (solo forense)
      sourceLang = "auto",
      targetLang = "en",
      mode = "legal",          // legal | forense | otros
      sessionId = null,
    } = req.body || {};

    // --------------------------------------------------
    // Validación mínima
    // --------------------------------------------------
    if (!["text", "forense"].includes(inputType)) {
      return res.json({ ok: false, error: "Tipo de entrada inválido" });
    }

    if (typeof text !== "string" || !text.trim()) {
      return res.json({ ok: false, error: "Texto inválido o vacío" });
    }

    const originalText = text.trim();

    // --------------------------------------------------
    // 🔎 MODO FORENSE — SALIDA DIRECTA
    // --------------------------------------------------
    if (mode === "forense" || inputType === "forense") {
      return res.json({
        ok: true,
        originalText,
        segments: Array.isArray(segments) ? segments : [],
        metadata: {
          mode: "forense",
          input: "text",
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
        input: "text",
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
