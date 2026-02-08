// ============================================================================
// 🧩 sttChunks — STT por segmentos (FORENSE CANÓNICO)
// ----------------------------------------------------------------------------
// - Consume chunks de audio desde archivo
// - Usa transcribeAudio (STT puro)
// - Devuelve texto crudo
// - Devuelve segmentos con timestamps ABSOLUTOS
// - NO interpreta
// - NO normaliza
// ============================================================================

import { transcribeAudio } from "../__deprecated__/transcribeAudio.js";

export async function transcribeChunks(chunks = []) {
  let fullText = "";
  const segments = [];

  let offsetSec = 0;
  let globalIndex = 0;

  for (const chunkPath of chunks) {
    const res = await transcribeAudio({
      filePath: chunkPath,
      forense: true,
    });

    // --------------------------------------------------
    // Texto crudo
    // --------------------------------------------------
    if (res?.text) {
      fullText += res.text + "\n";
    }

    // --------------------------------------------------
    // Segmentos con tiempo ABSOLUTO
    // --------------------------------------------------
    if (Array.isArray(res?.segments) && res.segments.length > 0) {
      res.segments.forEach((s) => {
        const start = Number(s.start ?? 0);
        const end = Number(s.end ?? 0);

        segments.push({
          index: globalIndex++,
          start,
          end,
          absoluteFrom: offsetSec + start,
          absoluteTo: offsetSec + end,
          text: String(s.text || "").trim(),
        });
      });

      // Whisper no da duración explícita:
      // el offset avanza hasta el último timestamp del chunk
      offsetSec += res.segments[res.segments.length - 1].end || 0;
    }
  }

  return {
    text: fullText.trim(),
    segments,
  };
}
