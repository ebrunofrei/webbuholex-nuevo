// ============================================================================
// ChatSessionMeta — Metadata canónica para Home Chat (R7.7++)
// ----------------------------------------------------------------------------
// NO almacena mensajes. Solo describe la sesión:
//
//   • usuarioId       → propietario
//   • sessionId       → thread_xxxxxx
//   • title           → título inferido por frontend (primer turno)
//   • lastMessage     → snippet del último mensaje (para Sidebar estilo GPT)
//   • archived        → preserva sesiones sin borrarlas
//   • updatedAt       → se actualiza en cada turno (ordenación perfecta)
//
// Mongo = fuente de verdad absoluta.
//
// ============================================================================

import mongoose from "mongoose";

const ChatSessionMetaSchema = new mongoose.Schema(
  {
    usuarioId: {
      type: String,
      required: true,
      index: true,
    },

    sessionId: {
      type: String,
      required: true,
      index: true,
    },

    // Título canónico: generado por frontend o primer mensaje del usuario
    title: {
      type: String,
      default: "Nueva consulta jurídica",
      maxlength: 200,
      trim: true,
    },

    // Último mensaje útil para mostrar en Sidebar como ChatGPT
    lastMessage: {
      type: String,
      default: "",
      maxlength: 500,
      trim: true,
    },

    archived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,                 // createdAt, updatedAt → ordenación perfecta
    collection: "chat_session_meta",
  }
);

// ---------------------------------------------------------------------------
// ÍNDICE COMPUESTO: evita duplicados por usuario + sesión.
// ---------------------------------------------------------------------------
ChatSessionMetaSchema.index({ usuarioId: 1, sessionId: 1 }, { unique: true });

// ---------------------------------------------------------------------------
// Garantiza recorte del lastMessage antes de guardar
// ---------------------------------------------------------------------------
ChatSessionMetaSchema.pre("save", function (next) {
  if (this.lastMessage && this.lastMessage.length > 500) {
    this.lastMessage = this.lastMessage.slice(0, 500);
  }
  next();
});

export default mongoose.model("ChatSessionMeta", ChatSessionMetaSchema);
