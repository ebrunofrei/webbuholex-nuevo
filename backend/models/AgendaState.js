import mongoose from "mongoose";

const AgendaStateSchema = new mongoose.Schema(
  {
    // ⛔ NO ObjectId
    // ✅ STRING estable (auth uid)
    usuarioId: {
      type: String,
      required: true,
      index: true,
    },

    // Ej: "ASK_REMINDER"
    type: {
      type: String,
      required: true,
    },

    // ID del evento relacionado
    eventId: {
      type: String, // también string-safe
      default: null,
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// TTL real en Mongo (limpieza automática)
AgendaStateSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("AgendaState", AgendaStateSchema);
