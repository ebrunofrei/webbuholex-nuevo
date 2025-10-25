import mongoose from "mongoose";

const MensajeSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    // metadatos opcionales
    intencion: { type: String },           // "redaccion", "analisis_juridico", etc.
    materiaDetectada: { type: String },    // "civil", "laboral", etc.
    idioma: { type: String, default: "es-PE" },
    pais: { type: String, default: "Perú" },
  },
  { _id: false }
);

const ConversacionSchema = new mongoose.Schema(
  {
    usuarioId: { type: String, required: true },   // uid del usuario o "invitado"
    expedienteId: { type: String, default: "default" },

    // Array ordenado cronológicamente
    mensajes: {
      type: [MensajeSchema],
      default: [],
    },

    // último update
    updatedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "conversaciones" }
);

// índice para búsquedas rápidas por usuario+expediente
ConversacionSchema.index({ usuarioId: 1, expedienteId: 1 }, { unique: true });

export default mongoose.model("Conversacion", ConversacionSchema);
