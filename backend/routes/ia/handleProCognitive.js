// ============================================================================
// 🧠 handleProCognitive — R7.7++ PRODUCTION
// ----------------------------------------------------------------------------
// Pro channel handler
// - Full decisional cognitive profile
// - Canonical Cognitive Kernel
// - Strong continuity, jurisdiction-aware
// - No quotas (handled by plan/channel level)
// ============================================================================

import { buildSystemPrompt } from "../../brain/buildSystemPrompt.js";
import { runLLMCompletion } from "../../services/llm/runLLMCompletion.js";
import { saveTurn } from "../../services/llm/historyService.js";
import { trackEvent } from "../../services/telemetry/telemetryService.js";

import { extractSemanticTags } from "../../brain/semantic/extractSemanticTags.js";
import { detectReset } from "../../brain/context/detectReset.js";
import { getJurisdictionContext } from "../../brain/jurisdiction/getJurisdictionContext.js";

export async function handleProCognitive(req, res) {
  try {
    const {
      prompt,
      sessionId,
      locale = "es",
      mode = "consultive",

      // Optional backend context (documents, case files, etc.)
      backendContext = "",
      jurisdictionCode = null,
    } = req.body || {};

    const usuarioId = req.user?.id || req.body?.usuarioId || null;
    const userPlan = req.user?.plan || "pro";

    // --------------------------------------------------
    // Input validation (strict, Pro-only)
    // --------------------------------------------------
    if (!usuarioId) {
      return res.status(401).json({
        ok: false,
        error: "auth_required",
      });
    }

    if (!prompt || !sessionId) {
      return res.status(400).json({
        ok: false,
        error: "invalid_request",
      });
    }

    // --------------------------------------------------
    // 1. Brain-level preparation (full power)
    // --------------------------------------------------
    const tags = await extractSemanticTags(prompt);
    const resetNotice = detectReset(prompt);

    const jurisdiction = jurisdictionCode
      ? await getJurisdictionContext(jurisdictionCode)
      : null;

    // --------------------------------------------------
    // 2. Cognitive payload (PRO = decisional)
    // --------------------------------------------------
    const cognitive = {
      profileKey: "juris_decisional", // 🔑 PRO profile
      tags,
      jurisdiction,
      action: resetNotice ? "RESET" : "MERGE_CONTEXT",
      affinity: 0.5, // stronger continuity than Bubble
      turnCount: 1, // (puede escalar luego con memoria)
      profile: {
        depth: "high",
        ambiguityTolerance: "medium",
      },
    };

    // --------------------------------------------------
    // 3. Build SYSTEM prompt (canonical kernel)
    // --------------------------------------------------
    const systemPrompt = buildSystemPrompt({
      cognitive,
      mode,
      locale,
      extraContext: backendContext,
      resetNotice,
    });

    // --------------------------------------------------
    // 4. Execute LLM (canonical gateway)
    // --------------------------------------------------
    const reply = await runLLMCompletion({
      systemPrompt,
      userPrompt: prompt,
      channel: "pro_chat",
    });

    // --------------------------------------------------
    // 5. Telemetry (learning & monitoring)
    // --------------------------------------------------
    trackEvent("pro_completion", {
      usuarioId,
      sessionId,
      channel: "pro_chat",
      plan: userPlan,
      profileKey: "juris_decisional",
      jurisdiction: jurisdictionCode || null,
      hasBackendContext: !!backendContext,
    }).catch(() => {});

    // --------------------------------------------------
    // 6. Persist turn (canonical, non-blocking)
    // --------------------------------------------------
    saveTurn({
      sessionId,
      usuarioId,
      prompt,
      reply,
      meta: {
        channel: "pro_chat",
        profileKey: "juris_decisional",
        mode,
        jurisdiction: jurisdictionCode || null,
      },
    }).catch(() => {});

    // --------------------------------------------------
    // 7. Response
    // --------------------------------------------------
    return res.json({
      ok: true,
      respuesta: reply,
      channel: "pro_chat",
    });
  } catch (err) {
    console.error("🔥 [handleProCognitive]", err);

    return res.json({
      ok: true,
      respuesta:
        "An unexpected technical issue occurred while processing the analysis. Please try again.",
      channel: "pro_chat",
    });
  }
}
