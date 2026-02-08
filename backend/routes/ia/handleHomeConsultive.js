// ============================================================================
// LITIS | HOME Consultive Handler — R7.7++ PRODUCTION
// ----------------------------------------------------------------------------
// - Home Chat PUBLIC (no login, no req.user)
// - Stateless LLM
// - Canonical persistence via ChatMessage (saveTurn)
// - JSON-only, deterministic, UX-safe
// ============================================================================

import { runChatLLM } from "../../services/llm/chatService.js";
import { saveTurn } from "../../services/llm/historyService.js";

export async function handleHomeConsultive(req, res) {
  try {
    const body = req.body || {};

    const prompt = String(body.prompt || "").trim();
    const sessionId = String(body.sessionId || "").trim();
    const channel = body.channel || "home_chat";

    // -----------------------------------------------------------------------
    // INPUT VALIDATION (STRICT & PUBLIC-SAFE)
    // -----------------------------------------------------------------------
    if (!prompt) {
      return res.status(400).json({
        ok: false,
        error: "empty_prompt",
        message: "Prompt must be a non-empty string.",
      });
    }

    if (!sessionId) {
      return res.status(400).json({
        ok: false,
        error: "missing_session_id",
        message: "sessionId is required for Home Chat.",
      });
    }

    // -----------------------------------------------------------------------
    // LLM EXECUTION — STATELESS BY DESIGN
    // -----------------------------------------------------------------------
    const llmResponse = await runChatLLM({
      prompt,
      history: [], // Home Chat NEVER uses memory
      systemPrompt:
        "You are LitisBot, a legal AI assistant. Respond concisely and clearly. Ask clarifying questions when needed.",
      options: { temperature: 0.4 },
    });

    const replyText = String(llmResponse?.text || "").trim();

    // -----------------------------------------------------------------------
    // CANONICAL PERSISTENCE (PUBLIC — NO USER REQUIRED)
    // -----------------------------------------------------------------------
    await saveTurn({
      sessionId,
      prompt,
      reply: replyText,
      meta: {
        channel,
        kernel: "home_consultive",
        protocol: "R7.7++",
        ts: Date.now(),
      },
    });

    // -----------------------------------------------------------------------
    // SAFE JSON RESPONSE (NEVER HTML)
    // -----------------------------------------------------------------------
    return res.status(200).json({
      ok: true,
      sessionId,
      message: replyText,
    });
  } catch (err) {
    console.error("🔥 [handleHomeConsultive] Error:", err);

    return res.status(500).json({
      ok: false,
      error: "home_consultive_error",
      message:
        err?.message ||
        "Unexpected error inside Home Chat handler.",
    });
  }
}
