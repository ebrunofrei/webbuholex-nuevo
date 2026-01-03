// ============================================================================
// 🧠 ConversationAnchor — Núcleo Semántico Persistente
// ----------------------------------------------------------------------------
// - 1 anchor por sesión de chat
// - Guarda el "para qué" de la conversación
// - Fuente de verdad del estado cognitivo
// ============================================================================

import mongoose from "mongoose";

const { Schema } = mongoose;

// ---------------------------------------------------------------------------
// SUBDOCUMENTOS
// ---------------------------------------------------------------------------

const InstructionRootSchema = new Schema(
  {
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ObjectiveSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["criterio", "analisis", "redaccion", "planificacion"],
      default: "criterio",
    },
    description: { type: String },
  },
  { _id: false }
);

const StateSchema = new Schema(
  {
    intent: {
      type: String,
      enum: ["criterio", "analisis", "redaccion"],
      default: "criterio",
    },
    phase: {
      type: String,
      enum: ["explore", "analyze", "draft"],
      default: "explore",
    },
  },
  { _id: false }
);

const ContextSnapshotSchema = new Schema(
  {
    hechos: { type: String },
    normas: { type: String },
    riesgos: { type: String },
    observaciones: { type: String },
  },
  { _id: false }
);

// ---------------------------------------------------------------------------
// ESQUEMA PRINCIPAL
// ---------------------------------------------------------------------------

const ConversationAnchorSchema = new Schema(
  {
    // 🔑 Identidad
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    caseId: {
      type: Schema.Types.ObjectId,
      ref: "Case",
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },

    // 🧠 Núcleo semántico
    instructionRoot: InstructionRootSchema,
    objective: ObjectiveSchema,
    state: StateSchema,

    // 📌 Contexto resumido (no histórico)
    contextSnapshot: ContextSnapshotSchema,

    // 🕒 Control
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    collection: "conversation_anchors",
  }
);

// ---------------------------------------------------------------------------
// HOOKS
// ---------------------------------------------------------------------------

ConversationAnchorSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// ---------------------------------------------------------------------------
// EXPORT
// ---------------------------------------------------------------------------

export default mongoose.model(
  "ConversationAnchor",
  ConversationAnchorSchema
);
