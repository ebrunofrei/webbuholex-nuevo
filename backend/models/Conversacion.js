// ============================================================================
// 🧠 Conversacion — Memoria de Sesión (Short-Term Memory)
// ----------------------------------------------------------------------------
// - Guarda mensajes breves por expediente (case_<id>)
// - NO guarda embeddings (eso es historia formal)
// - Se usa en memoryService.js
// ============================================================================

import mongoose from "mongoose";

const MensajeSchema = new mongoose.Schema(
  {
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

    fecha: {
      type: Date,
      default: Date.now,
    },

    // Meta ligera opcional — NO embeddings
    meta: {
      type: Object,
      default: {},
    },
  },
  { _id: false }
);

const ConversacionSchema = new mongoose.Schema(
  {
    usuarioId: { type: String, required: true },
    expedienteId: { type: String, required: true },

    mensajes: {
      type: Array,
      default: [],
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "Conversaciones",
  }
);

const Conversacion = mongoose.model("Conversacion", ConversacionSchema);
export default Conversacion;
