// ============================================================================
// LITIS | Bubble Consultive Handler — R7.7++ FINAL CANONICAL
// ----------------------------------------------------------------------------
// RULES:
// - Conversation ALWAYS continues
// - Advanced analysis is SOFT-limited
// - Unlock is ABSOLUTE (no quota, no badge)
// - sessionNote ONLY when real limit is hit
// - Single Usuario read
// - Errors NEVER break UX
// ============================================================================

import { saveTurn } from "../../services/llm/historyService.js";
import { runLLMCompletion } from "../../services/llm/runLLMCompletion.js";
import { trackEvent } from "../../services/telemetry/telemetryService.js";
import { resolveEntitlements } from "../../services/flags/featureFlags.js";

import { buildSystemPrompt } from "../../brain/buildSystemPrompt.js";
import { extractSemanticTags } from "../../brain/semantic/extractSemanticTags.js";
import { detectReset } from "../../brain/context/detectReset.js";
import { getJurisdictionContext } from "../../brain/jurisdiction/getJurisdictionContext.js";
import { detectLanguage } from "../../brain/i18n/languageDetector.js";

import { detectUserIntent } from "./bubble/bubbleIntentDetector.js";
import {
  checkBubbleQuota,
  consumeBubbleQuota,
} from "./bubble/bubbleLimiter.js";
import { classifyBubbleResponse } from "./bubble/bubbleClassifier.js";

import Usuario from "../../models/Usuario.js";

// ============================================================================
// MAIN HANDLER
// ============================================================================
export async function handleBubbleConsultive(req, res) {
  let reply = "";
  let sessionNote = null;
  let limitReached = false;

  try {
    const {
      prompt,
      sessionId,
      pdfJurisContext,
      jurisSeleccionada,
      jurisdictionCode = null,
    } = req.body || {};

    const usuarioId = req.user?.id || req.body?.usuarioId || null;
    const userPlan = req.user?.plan || "bubble_free";

    if (!usuarioId || !prompt || !sessionId) {
      return res.status(400).json({
        ok: false,
        error: "invalid_request",
      });
    }

    // --------------------------------------------------
    // Language + intent
    // --------------------------------------------------
    const language = detectLanguage(prompt);
    const intent = detectUserIntent(prompt);

    // --------------------------------------------------
    // Jurisprudence mode
    // --------------------------------------------------
    const hasJurisContext =
      !!pdfJurisContext || !!jurisSeleccionada;

    const bubbleMode = hasJurisContext
      ? "jurisprudencia"
      : "general";

    // --------------------------------------------------
    // Cognitive preparation
    // --------------------------------------------------
    const tags = await extractSemanticTags(prompt);
    const resetNotice = detectReset(prompt);

    const jurisdiction = jurisdictionCode
      ? await getJurisdictionContext(jurisdictionCode)
      : null;

    const cognitive = {
      profileKey: "juris_descriptive",
      tags,
      jurisdiction,
      action: resetNotice ? "RESET" : "MERGE_CONTEXT",
      affinity: 0.3,
      turnCount: 1,
    };

    // --------------------------------------------------
    // System prompt
    // --------------------------------------------------
    const systemPrompt = buildSystemPrompt({
      cognitive,
      mode: bubbleMode,
      locale: language,
      resetNotice,
      extraContext: pdfJurisContext || "",
    });

    // --------------------------------------------------
    // Execute LLM (ALWAYS)
    // --------------------------------------------------
    reply = await runLLMCompletion({
      systemPrompt,
      userPrompt: prompt,
      channel: "bubble_chat",
    });

    // --------------------------------------------------
    // Classify response
    // --------------------------------------------------
    const analysisType = classifyBubbleResponse({
      reply,
      pdfJurisContext,
      jurisSeleccionada,
    });

    const isAdvanced =
      analysisType === "deep_analysis" ||
      analysisType === "jurisprudential_analysis";

    // --------------------------------------------------
    // Single Usuario read (unlock check)
    // --------------------------------------------------
    let hasActiveUnlock = false;

    if (isAdvanced) {
      const user = await Usuario.findById(usuarioId)
        .select("analysisUnlock")
        .lean();

      if (
        user?.analysisUnlock?.activeUntil &&
        user.analysisUnlock.activeUntil > new Date()
      ) {
        hasActiveUnlock = true;
      }
    }

    // --------------------------------------------------
    // Quota enforcement (ONLY if no unlock)
    // --------------------------------------------------
    if (isAdvanced && !hasActiveUnlock) {
      const entitlements = resolveEntitlements({ plan: userPlan });

      const quota = await checkBubbleQuota(
        usuarioId,
        analysisType,
        entitlements.dailyLimits
      );

      if (!quota.allowed) {
        limitReached = true;

        sessionNote = {
          type: "analysis_boundary",
          scope: "advanced_analysis",
          level: "info",
          message:
            language === "es"
              ? "Límite de análisis avanzado alcanzado. Puedes seguir conversando o desbloquear análisis por 24 horas."
              : "Advanced analysis limit reached. You can keep chatting or unlock advanced analysis for 24 hours.",
        };
      } else {
        await consumeBubbleQuota(usuarioId, analysisType);
      }
    }

    // --------------------------------------------------
    // Telemetry (non-blocking)
    // --------------------------------------------------
    trackEvent("bubble_completion", {
      usuarioId,
      sessionId,
      intent,
      analysisType,
      limitReached,
      hasActiveUnlock,
    }).catch(() => {});

    // --------------------------------------------------
    // Persist turn (non-blocking)
    // --------------------------------------------------
    saveTurn({
      sessionId,
      usuarioId,
      prompt,
      reply,
      meta: {
        analysisType,
        limitReached,
        hasActiveUnlock,
      },
    }).catch(() => {});

    // --------------------------------------------------
    // Response (SESSION ALWAYS ACTIVE)
    // --------------------------------------------------
    return res.json({
      ok: true,
      respuesta: reply,
      channel: "bubble_chat",
      analysisType,
      limitReached,
      sessionNote,
    });
  } catch (err) {
    console.error("🔥 [handleBubbleConsultive]", err);

    return res.json({
      ok: true,
      respuesta:
        "Podemos seguir conversando sin problema. ¿Cómo continúo ayudándote?",
      channel: "bubble_chat",
      analysisType: "simple",
      limitReached: false,
      sessionNote: null,
    });
  }
}
