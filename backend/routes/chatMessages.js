// ============================================================================
// 📁 chatMessages.js — HOME CHAT (PUBLIC) R7.7++
// ----------------------------------------------------------------------------
// FULL hydration of a session history
// GET /api/chat-messages?sessionId=xxx
// ALWAYS returns a SAFE ARRAY (never throws)
// ============================================================================

import express from "express";
import ChatMessage from "../models/ChatMessage.js";

const router = express.Router();

const ALLOWED_ROLES = new Set(["user", "assistant"]);

/**
 * GET /api/chat-messages?sessionId=xxx
 * Canonical response: ALWAYS an array
 */
router.get("/", async (req, res) => {
  try {
    const sessionId = String(req.query.sessionId || "").trim();

    // No session → empty list (canonical)
    if (!sessionId) return res.json([]);

    // Hard guard (anti-abuse / malformed input)
    if (sessionId.length > 200) {
      console.warn("⚠️ [chat-messages] sessionId too long:", sessionId.length);
      return res.json([]);
    }

    const messages = await ChatMessage.find({ sessionId })
      .sort({ createdAt: 1 })
      .select("role content meta createdAt")
      .lean();

    return res.json(
      messages.map((m) => ({
        role: ALLOWED_ROLES.has(m.role) ? m.role : "assistant",
        content: typeof m.content === "string" ? m.content : "",
        meta: m.meta && typeof m.meta === "object" ? m.meta : {},
        createdAt: m.createdAt || null,
      }))
    );
  } catch (err) {
    console.error("🔥 [chat-messages] ERROR:", err);
    return res.json([]); // canonical: frontend never breaks
  }
});

export default router;
