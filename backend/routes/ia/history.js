// ============================================================================
// LITIS | History Router — Canonical R7.7++
// ----------------------------------------------------------------------------
// - Sessions projection derived ONLY from ChatMessage
// - Deterministic titles
// - JSON-only responses
// - Error-proof routing
// ============================================================================

import express from "express";
import ChatMessage from "../../models/ChatMessage.js";

const router = express.Router();

// Force JSON output
router.use((req, res, next) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  next();
});

/**
 * ============================================================================
 * GET /api/ia/sessions
 * Canonical projection of conversational threads
 * ============================================================================
 */
router.get("/sessions", async (req, res) => {
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) return res.json([]);

    const rows = await ChatMessage.aggregate([
      { $match: { usuarioId } },

      // Guarantee strict chronological grouping logic
      { $sort: { createdAt: 1 } },

      {
        $group: {
          _id: "$sessionId",
          firstUserMessage: {
            $first: {
              $cond: [
                { $eq: ["$role", "user"] },
                "$content",
                "$$REMOVE" // ignore nulls
              ]
            }
          },
          updatedAt: { $max: "$createdAt" }
        }
      },

      { $sort: { updatedAt: -1 } }
    ]);

    const sessions = rows.map((s) => {
      const title = s.firstUserMessage
        ? String(s.firstUserMessage).slice(0, 48)
        : "Nueva consulta jurídica";

      return {
        id: s._id, // IMPORTANT: frontend expects "id"
        title,
        updatedAt: s.updatedAt
      };
    });

    return res.json(sessions);

  } catch (err) {
    console.error("🔥 [history.sessions] error:", err);
    return res.status(500).json({
      ok: false,
      error: "history_sessions_error",
      message: err?.message || "Unexpected error processing sessions."
    });
  }
});

/**
 * ============================================================================
 * GET /api/ia/session/:id
 * Canonical full hydration of a thread
 * ============================================================================
 */
router.get("/session/:id", async (req, res) => {
  try {
    const usuarioId = req.user?.id;
    const sessionId = req.params.id;

    if (!usuarioId || !sessionId) return res.json([]);

    const messages = await ChatMessage.find({
      usuarioId,
      sessionId
    })
      .sort({ createdAt: 1 })
      .select({
        role: 1,
        content: 1,
        meta: 1,
        createdAt: 1
      })
      .lean();

    return res.json(messages);

  } catch (err) {
    console.error("🔥 [history.session] error:", err);
    return res.status(500).json({
      ok: false,
      error: "history_session_error",
      message: err?.message || "Unexpected error loading session."
    });
  }
});

/**
 * ============================================================================
 * GET /api/ia/messages?sessionId=...
 * Legacy alias — safe version
 * ============================================================================
 */
router.get("/messages", async (req, res) => {
  try {
    const usuarioId = req.user?.id;
    const { sessionId } = req.query;

    if (!usuarioId || !sessionId) return res.json([]);

    const messages = await ChatMessage.find({
      usuarioId,
      sessionId
    })
      .sort({ createdAt: 1 })
      .select({
        role: 1,
        content: 1,
        meta: 1,
        createdAt: 1
      })
      .lean();

    return res.json(messages);

  } catch (err) {
    console.error("🔥 [history.messages] error:", err);
    return res.status(500).json({
      ok: false,
      error: "history_messages_error",
      message: err?.message || "Unexpected error loading messages."
    });
  }
});

export default router;
