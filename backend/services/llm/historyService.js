// ======================================================================
// 🧠 historyService — CANÓNICO ENTERPRISE v3 (FINAL)
// ----------------------------------------------------------------------
// Fuente única de verdad del historial conversacional.
// PRINCIPIOS:
// - MongoDB = verdad absoluta
// - El cerebro (IA) define el contrato
// - Rehidratación garantizada
// - Auditoría completa
// - Este archivo NO se vuelve a tocar
// ======================================================================

import ChatMessage from "../../models/ChatMessage.js";
import { getEmbedding } from "../llm/embeddingService.js";

// ======================================================================
// CARGAR HISTORIAL (REHIDRATACIÓN)
// ======================================================================
export async function loadHistory({
  usuarioId,
  expedienteId,
  sessionId,        // alias de compatibilidad
  limit = 500,
}) {
  const sid = expedienteId || sessionId;
  if (!sid) return [];

  try {
    const msgs = await ChatMessage.find({ sessionId: sid })
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
    if (process.env.NODE_ENV !== "production") {
      console.error("[historyService.loadHistory]", err);
    }
    return [];
  }
}

// ======================================================================
// GUARDAR MENSAJE INDIVIDUAL (LOW LEVEL — RARO USO)
// ======================================================================
export async function saveMessage({
  usuarioId,
  caseId,
  expedienteId,
  sessionId,
  role,
  content,
  meta = {},
}) {
  const sid = expedienteId || sessionId;
  if (!usuarioId || !sid || !role || !content) return null;

  try {
    const embedding = await getEmbedding(String(content));

    const msg = await ChatMessage.create({
      usuarioId,
      caseId: caseId || null,
      sessionId: sid,
      role,
      content: String(content),
      embedding,
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
    if (process.env.NODE_ENV !== "production") {
      console.error("[historyService.saveMessage]", err);
    }
    return null;
  }
}

// ======================================================================
// GUARDAR TURNO COMPLETO (CANÓNICO)
// ----------------------------------------------------------------------
// ✔️ Acepta contrato REAL de ia.js
// ✔️ Mantiene orden lógico
// ✔️ Fuente única de escritura
// ======================================================================
export async function saveTurn({
  usuarioId,
  caseId = null,
  expedienteId,
  sessionId,           // alias
  prompt,              // nombre REAL desde ia.js
  reply,               // nombre REAL desde ia.js
  userMessage,         // compat legacy
  assistantMessage,    // compat legacy
  meta = {},
}) {
  const sid = expedienteId || sessionId;
  if (!usuarioId || !sid) return false;

  const userText = prompt || userMessage;
  const assistantText = reply || assistantMessage;

  try {
    const ops = [];

    if (userText && userText.trim()) {
      ops.push({
        usuarioId,
        caseId,
        sessionId: sid,
        role: "user",
        content: userText.trim(),
        embedding: await getEmbedding(userText),
        meta,
      });
    }

    if (assistantText && assistantText.trim()) {
      ops.push({
        usuarioId,
        caseId,
        sessionId: sid,
        role: "assistant",
        content: assistantText.trim(),
        embedding: await getEmbedding(assistantText),
        meta,
      });
    }

    if (ops.length) {
      await ChatMessage.insertMany(ops);
    }

    return true;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[historyService.saveTurn]", err);
    }
    return false;
  }
}

// ======================================================================
// ÚLTIMO MENSAJE (FOLLOW-UPS / AGENDA / CONFIRMACIONES)
// ======================================================================
export async function getLastMessage({ expedienteId, sessionId }) {
  const sid = expedienteId || sessionId;
  if (!sid) return null;

  try {
    const last = await ChatMessage.findOne({ sessionId: sid })
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
    if (process.env.NODE_ENV !== "production") {
      console.error("[historyService.getLastMessage]", err);
    }
    return null;
  }
}
