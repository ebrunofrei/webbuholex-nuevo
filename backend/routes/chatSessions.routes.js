// ============================================================================
// 📁 chatSessions.routes.js — HOME CHAT (PUBLIC) R7.7++
// ----------------------------------------------------------------------------
// - NO AUTH (guest-first, marketing channel)
// - Identity = sessionId + PUBLIC_USER
// - GET is PURE (no DB mutations)
// - Stable ordering, no UI resets
// ============================================================================

import express from "express";
import ChatSessionMeta from "../models/ChatSessionMeta.js";
import ChatMessage from "../models/ChatMessage.js";

const router = express.Router();

const DEFAULT_TITLE = "Nueva consulta jurídica";
const PUBLIC_USER = "public";

// ============================================================================
// 🟢 POST /api/chat-sessions
// Create public session (idempotent)
// ============================================================================
router.post("/", async (req, res) => {
  try {
    const usuarioId = PUBLIC_USER;
    const { sessionId, title } = req.body;

    if (!sessionId || typeof sessionId !== "string") {
      return res.status(400).json({ ok: false, error: "invalid_sessionId" });
    }

    const meta = await ChatSessionMeta.findOneAndUpdate(
      { usuarioId, sessionId },
      {
        $setOnInsert: {
          usuarioId,
          sessionId,
          title: title?.trim() || DEFAULT_TITLE,
          archived: false,
        },
        $set: { updatedAt: new Date() },
      },
      { new: true, upsert: true, lean: true }
    );

    return res.json({
      ok: true,
      session: {
        id: meta.sessionId,
        title: meta.title,
        archived: meta.archived,
        updatedAt: meta.updatedAt,
      },
    });
  } catch (err) {
    console.error("🔥 [chat-sessions] create error:", err);
    return res.status(500).json({ ok: false, error: "create_failed" });
  }
});

// ============================================================================
// 🟡 GET /api/chat-sessions
// Public list — PURE (NO side effects)
// ============================================================================
router.get("/", async (_req, res) => {
  try {
    const usuarioId = PUBLIC_USER;

    const metas = await ChatSessionMeta.find({ usuarioId })
      .sort({ updatedAt: -1 })
      .lean();

    // ⛔ NO DB WRITES HERE — read-only
    const sessions = await Promise.all(
      metas.map(async (m) => {
        const lastMsg = await ChatMessage.findOne({
          sessionId: m.sessionId,
        })
          .sort({ createdAt: -1 })
          .lean();

        return {
          id: m.sessionId,
          title:
            m.title === DEFAULT_TITLE && lastMsg?.role === "user"
              ? lastMsg.content.slice(0, 60).trim()
              : m.title,
          archived: !!m.archived,
          updatedAt: lastMsg?.createdAt || m.updatedAt,
        };
      })
    );

    return res.json(sessions);
  } catch (err) {
    console.error("🔥 [chat-sessions] list error:", err);
    return res.json([]); // public chat must never break UI
  }
});

// ============================================================================
// 🟠 PATCH /api/chat-sessions/:id
// Update metadata (rename / archive / restore)
// ============================================================================
router.patch("/:id", async (req, res) => {
  try {
    const usuarioId = PUBLIC_USER;
    const sessionId = String(req.params.id || "").trim();
    const updates = req.body || {};

    if (!sessionId) {
      return res.status(400).json({ ok: false, error: "invalid_sessionId" });
    }

    const allowedUpdates = {};
    if (typeof updates.title === "string") {
      allowedUpdates.title = updates.title.trim() || DEFAULT_TITLE;
    }
    if (typeof updates.archived === "boolean") {
      allowedUpdates.archived = updates.archived;
    }

    if (Object.keys(allowedUpdates).length === 0) {
      return res.json({ ok: true, updated: false });
    }

    const meta = await ChatSessionMeta.findOneAndUpdate(
      { usuarioId, sessionId },
      {
        $set: {
          ...allowedUpdates,
          updatedAt: new Date(),
        },
      },
      { new: true, lean: true }
    );

    if (!meta) {
      return res.status(404).json({ ok: false, error: "session_not_found" });
    }

    return res.json({
      ok: true,
      session: {
        id: meta.sessionId,
        title: meta.title,
        archived: meta.archived,
        updatedAt: meta.updatedAt,
      },
    });
  } catch (err) {
    console.error("🔥 [chat-sessions] patch error:", err);
    return res.status(500).json({ ok: false, error: "update_failed" });
  }
});

// ============================================================================
// 🔴 DELETE /api/chat-sessions/:id
// Full deletion (public, deterministic)
// ============================================================================
router.delete("/:id", async (req, res) => {
  try {
    const usuarioId = PUBLIC_USER;
    const sessionId = String(req.params.id || "").trim();

    if (!sessionId) {
      return res.json({ ok: true, deleted: false });
    }

    await Promise.all([
      ChatSessionMeta.deleteOne({ usuarioId, sessionId }),
      ChatMessage.deleteMany({ sessionId }),
    ]);

    return res.json({ ok: true, deleted: true });
  } catch (err) {
    console.error("🔥 [chat-sessions] delete error:", err);
    return res.status(500).json({ ok: false, error: "delete_failed" });
  }
});

export default router;
