// ============================================================================
// 📁 ChatMessage.js — CANONICAL R7.7++ (PUBLIC + PRO SAFE)
// ----------------------------------------------------------------------------
// - Home Chat (PUBLIC): NO usuarioId
// - Pro / Case Chat: usuarioId REQUIRED
// - sessionId = única identidad universal
// ============================================================================

import mongoose from "mongoose";

const ChatMessageSchema = new mongoose.Schema(
  {
    // ❗️ SOLO requerido para Pro / Case Chat
    usuarioId: {
      type: String,
      required: false,
      index: true,
      default: null,
    },

    sessionId: {
      type: String,
      required: true,
      index: true,
    },

    caseId: {
      type: String,
      default: null,
      index: true,
    },

    role: {
      type: String,
      enum: ["user", "assistant", "system"],
      required: true,
    },

    content: {
      type: String,
      required: true,
      trim: true,
    },

    embedding: {
      type: [Number],
      default: null,
    },

    meta: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: "chat_messages",
  }
);

// ---------------------------------------------------------------------------
// ÍNDICES CANÓNICOS
// ---------------------------------------------------------------------------
ChatMessageSchema.index({ sessionId: 1, createdAt: 1 });
ChatMessageSchema.index({ usuarioId: 1, sessionId: 1 });

export default mongoose.model("ChatMessage", ChatMessageSchema);
