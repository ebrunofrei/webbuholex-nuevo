// ============================================================================
// LITIS | Unified IA Router — CANONICAL R7.7++
// ----------------------------------------------------------------------------
// - Always returns JSON
// - Explicit non-chat IA actions
// - Strict channel routing
// ============================================================================

import express from "express";

import { handleHomeConsultive } from "./handleHomeConsultive.js";
import { handleBubbleConsultive } from "./handleBubbleConsultive.js";
import { handleProCognitive } from "./handleProCognitive.js";

// 🆕 Bubble analysis unlock
import { handleUnlockAnalysis } from "./unlock-analysis.js";

import historyRouter from "./history.js";

const router = express.Router();

// ---------------------------------------------------------------------------
// Always JSON
// ---------------------------------------------------------------------------
router.use((req, res, next) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  next();
});

// ---------------------------------------------------------------------------
// History (isolated)
// ---------------------------------------------------------------------------
router.use("/history", historyRouter);

// ---------------------------------------------------------------------------
// NON-CHAT IA ACTIONS
// ---------------------------------------------------------------------------

// POST /api/ia/unlock-analysis
router.post("/unlock-analysis", async (req, res) => {
  try {
    return await handleUnlockAnalysis(req, res);
  } catch (err) {
    console.error("🔥 [Unlock Analysis Fatal]", err);
    return res.status(500).json({
      ok: false,
      error: "unlock_failed",
    });
  }
});

// ---------------------------------------------------------------------------
// CHAT GATEWAY
// ---------------------------------------------------------------------------
router.post("/chat", async (req, res) => {
  try {
    const body = req.body || {};

    if (!body.prompt || typeof body.prompt !== "string") {
      return res.status(400).json({
        ok: false,
        error: "invalid_prompt",
      });
    }

    if (!body.sessionId || typeof body.sessionId !== "string") {
      return res.status(400).json({
        ok: false,
        error: "missing_session_id",
      });
    }

    const channel = body.channel || "home_chat";
    const role = body.role || "consultive";

    if (role === "cognitive" && channel !== "pro_chat") {
      return res.status(400).json({
        ok: false,
        error: "invalid_channel_role_combination",
      });
    }

    if (channel === "pro_chat") {
      return await handleProCognitive(req, res);
    }

    if (channel === "bubble_chat" || channel === "juris_bubble") {
      return await handleBubbleConsultive(req, res);
    }

    return await handleHomeConsultive(req, res);
  } catch (err) {
    console.error("🔥 [IA Router Fatal Error]", err);
    return res.status(500).json({
      ok: false,
      error: "internal_server_error",
    });
  }
});

export default router;
