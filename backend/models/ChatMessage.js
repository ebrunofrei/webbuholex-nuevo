// ============================================================================
// 🦉 BúhoLex | ChatMessage — Memoria conversacional CANÓNICA
// ----------------------------------------------------------------------------
// - Fuente ÚNICA de verdad del chat
// - 1 Caso = 1 SessionId derivado (case_<caseId>)
// - NO depende de ChatSession
// - Totalmente rehidratable
// ============================================================================

import mongoose from "mongoose";

const ChatMessageSchema = new mongoose.Schema(
  {
    // ===============================
    // Identidad / Multi-tenant
    // ===============================
    usuarioId: {
      type: String,
      required: true,
      index: true,
    },

    // Caso jurídico (fuente real)
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Case",
      required: true,
      index: true,
    },

    // Session CANÓNICA (DERIVADA)
    // case_<caseId>
    sessionId: {
      type: String,
      required: true,
      index: true,
    },

    // ===============================
    // Mensaje
    // ===============================
    role: {
      type: String,
      enum: ["user", "assistant", "system"],
      required: true,
      index: true,
    },

    content: {
      type: String,
      required: true,
      trim: true,
    },

    meta: {
      type: Object,
      default: {},
    },

    // ===============================
    // Vector semántico (IA)
    // ===============================
    embedding: {
      type: [Number], // vector
      index: true,
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

// ===============================
// Índices enterprise
// ===============================
ChatMessageSchema.index({ sessionId: 1, createdAt: 1 });
ChatMessageSchema.index({ caseId: 1, createdAt: 1 });
ChatMessageSchema.index({ usuarioId: 1, caseId: 1, createdAt: 1 });

export default mongoose.model("ChatMessage", ChatMessageSchema);

