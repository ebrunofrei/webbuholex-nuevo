// ============================================================================
// LITIS | historyService — R7.7++ PRODUCTION
// ----------------------------------------------------------------------------
// - Fuente única de verdad: ChatMessage
// - Home Chat (PUBLIC): sessionId = thread_*   (NO usuarioId)
// - Pro / Case Chat: sessionId = case_* (+ usuarioId)
// - Escritura SIEMPRE determinista (no silent-fails)
// ============================================================================

import ChatMessage from "../../models/ChatMessage.js";
import { getEmbedding } from "../llm/embeddingService.js";

/* ========================================================================== */
/* SAFE EMBEDDING — nunca rompe escritura                                     */
/* ========================================================================== */
async function safeEmbed(text) {
  if (!text) return null;
  try {
    return await getEmbedding(text);
  } catch {
    return null;
  }
}

/* ========================================================================== */
/* LOAD HISTORY — PUBLIC SAFE                                                  */
/* ========================================================================== */
export async function loadHistory({ sessionId, limit = 500 }) {
  if (!sessionId) return [];

  try {
    const msgs = await ChatMessage.find({ sessionId })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean();

    return msgs.map((m) => ({
      id: m._id.toString(),
      role: m.role,
      content: m.content,
      meta: m.meta || {},
      createdAt: m.createdAt,
    }));
  } catch (err) {
    console.error("[historyService.loadHistory]", err);
    return [];
  }
}

/* ========================================================================== */
/* SAVE SINGLE MESSAGE — LOW LEVEL                                             */
/* ========================================================================== */
export async function saveMessage({
  sessionId,
  role,
  content,
  meta = {},
}) {
  if (!sessionId || !role || !content) return null;

  try {
    const msg = await ChatMessage.create({
      sessionId,
      caseId: null,
      role,
      content,
      embedding: await safeEmbed(content),
      meta,
    });

    return {
      id: msg._id.toString(),
      role: msg.role,
      content: msg.content,
      meta: msg.meta || {},
      createdAt: msg.createdAt,
    };
  } catch (err) {
    console.error("[historyService.saveMessage]", err);
    return null;
  }
}

/* ========================================================================== */
/* SAVE TURN — CANONICAL (NO SILENT FAILS)                                     */
/* ========================================================================== */
export async function saveTurn({
  sessionId,
  prompt,
  reply,
  meta = {},
}) {
  if (!sessionId) return true; // ⬅️ IMPORTANTE: nunca bloquear Home Chat

  const userText = typeof prompt === "string" ? prompt.trim() : "";
  const assistantText = typeof reply === "string" ? reply.trim() : "";

  if (!userText && !assistantText) return true;

  const now = new Date();
  const ops = [];

  if (userText) {
    ops.push({
      sessionId,
      caseId: null,
      role: "user",
      content: userText,
      embedding: await safeEmbed(userText),
      meta: { ...meta, kind: "user" },
      createdAt: now,
    });
  }

  if (assistantText) {
    ops.push({
      sessionId,
      caseId: null,
      role: "assistant",
      content: assistantText,
      embedding: await safeEmbed(assistantText),
      meta: { ...meta, kind: "assistant" },
      createdAt: now,
    });
  }

  try {
    if (ops.length > 0) {
      await ChatMessage.insertMany(ops, { ordered: true });
    }
    return true;
  } catch (err) {
    console.error("[historyService.saveTurn]", err);
    return true; // ⬅️ NUNCA romper UX por DB
  }
}

/* ========================================================================== */
/* GET LAST MESSAGE — PUBLIC SAFE                                              */
/* ========================================================================== */
export async function getLastMessage({ sessionId }) {
  if (!sessionId) return null;

  try {
    const last = await ChatMessage.findOne({ sessionId })
      .sort({ createdAt: -1 })
      .lean();

    if (!last) return null;

    return {
      id: last._id.toString(),
      role: last.role,
      content: last.content,
      meta: last.meta || {},
      createdAt: last.createdAt,
    };
  } catch (err) {
    console.error("[historyService.getLastMessage]", err);
    return null;
  }
}
