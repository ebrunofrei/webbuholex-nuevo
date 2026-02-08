import { resolveDocJuris } from "../utils/resolveDocJuris";
import { buildJurisPlainText } from "../utils/buildJurisPlainText";
import { detectBubbleMode } from "./detectBubbleMode";

// ============================================================================
// 🫧 Bubble Message Sender — R7.7++
// ----------------------------------------------------------------------------
// - Resolves jurisprudence context
// - Detects Bubble interaction mode
// - Builds canonical payload for /api/ia/chat
// ============================================================================

export async function sendBubbleMessage({
  texto,
  usuarioId,
  sessionId,
  jurisSeleccionada,
  pdfCtx,
  analysisState = {},
}) {
  // ---------------------------------------------------------------------------
  // 1. Resolve jurisprudence (prop → sessionStorage → normalized object)
  // ---------------------------------------------------------------------------
  const docJuris = resolveDocJuris(jurisSeleccionada);

  let jurisTextoBase = "";
  let hasJuris = false;

  if (docJuris) {
    jurisTextoBase = buildJurisPlainText(docJuris);
    hasJuris = Boolean(jurisTextoBase);
  }

  // ---------------------------------------------------------------------------
  // 2. Detect Bubble mode (FASE 3 foundation)
  // ---------------------------------------------------------------------------
  const bubbleMode = detectBubbleMode({
    text: texto,
    jurisSelected: docJuris,
    pdfCtx,
    analysisState,
  });

  // ---------------------------------------------------------------------------
  // 3. Build CANONICAL payload for IA Router
  // ---------------------------------------------------------------------------
  const payload = {
    prompt: texto,
    sessionId, // ✅ REQUIRED
    usuarioId,

    channel: "bubble_chat",
    role: "consultive",

    // Human-readable mode for backend / logging / rules
    modo:
      bubbleMode.mode === "jurisprudential"
        ? "jurisprudencia"
        : bubbleMode.mode === "consultive"
        ? "consultive"
        : "general",

    // Compatibility / legacy support
    jurisSeleccionada: docJuris || null,
    pdfJurisContext: pdfCtx || null,

    jurisprudenciaId:
      docJuris?.id ||
      docJuris?._id ||
      docJuris?.numeroExpediente ||
      null,

    // Signals for backend reasoning control (non-breaking)
    bubbleMode: bubbleMode.mode,
    bubbleSignals: bubbleMode.signals,
  };

  // ---------------------------------------------------------------------------
  // 4. Inject jurisprudence context ONLY when required
  // ---------------------------------------------------------------------------
  if (hasJuris && bubbleMode.requiresLegalReasoning) {
    payload.jurisTextoBase = jurisTextoBase;

    if (docJuris?.litisContext) {
      payload.jurisContext = docJuris.litisContext;
    }

    if (docJuris?.litisMeta) {
      payload.jurisMeta = docJuris.litisMeta;
    }

    if (docJuris?.litisSource) {
      payload.jurisSource = docJuris.litisSource;
    }

    if (docJuris?.litisContextId) {
      payload.jurisContextId = docJuris.litisContextId;
    }
  }

  // ---------------------------------------------------------------------------
  // 5. Request
  // ---------------------------------------------------------------------------
  const resp = await fetch("/api/ia/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await resp.json();

  if (!resp.ok || !data?.ok) {
    throw new Error(data?.error || "Bubble API error");
  }

  return data;
}
