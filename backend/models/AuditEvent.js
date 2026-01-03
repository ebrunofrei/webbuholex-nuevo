import mongoose from "mongoose";

const AuditEventSchema = new mongoose.Schema(
  {
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Case",
      default: null,
      index: true,
    },

    chatId: { type: String, required: true },

    action: {
      type: { type: String, required: true }, // agenda | draft | control
      payload: { type: Object, default: {} },
    },

    confirmation: {
      confirmedByUser: { type: Boolean, required: true },
      confirmedAt: { type: Date, required: true },
    },

    actor: {
      userId: { type: String, required: true },
      role: { type: String, default: "usuario" }, // futuro: abogado, admin
    },

    result: {
      ok: { type: Boolean, default: true },
      summary: { type: String }, // texto humano breve
      refId: { type: String },   // id del objeto creado (agendaId, draftId)
    },
    hash: {
     type: String,
     required: true,
     index: true,
    },
     prevHash: {
     type: String,
     default: null,
    },
  },
  {
    timestamps: true, // createdAt = momento del acto
  }
);

export default mongoose.model("AuditEvent", AuditEventSchema);
