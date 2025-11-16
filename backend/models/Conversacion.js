// backend/models/Conversacion.js
// ============================================================
// 🧠 BúhoLex | Modelo de Conversación (memoria IA)
// - Guarda turnos user/assistant por usuarioId + expedienteId
// - Cada mensaje trae metadatos: intención, materia, modo, juris, etc.
// ============================================================

import mongoose from "mongoose";

const { Schema } = mongoose;

/* ------------------------------ Mensaje ------------------------------ */

const MensajeSchema = new Schema(
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

    // Metadatos comunes
    intencion: { type: String }, // "redaccion", "analisis_juridico", etc.
    materiaDetectada: { type: String }, // "civil", "laboral", etc.
    idioma: { type: String, default: "es-PE" },
    pais: { type: String, default: "Perú" },
    modo: { type: String, default: "general" },

    // Identidad / tracking suave
    userEmail: { type: String },

    // Jurisprudencia asociada a este turno (si la hubo)
    jurisprudenciaIds: [{ type: String }], // array de ObjectId en string
    jurisprudenciaMeta: [
      {
        id: { type: String },
        titulo: { type: String },
        numeroExpediente: { type: String },
        tipoResolucion: { type: String },
        recurso: { type: String },
        salaSuprema: { type: String },
        organo: { type: String },
        especialidad: { type: String },
        fechaResolucion: { type: Date },
        fuente: { type: String },
        fuenteUrl: { type: String },
      },
    ],

    // Marca de tiempo del propio mensaje
    fecha: { type: Date, default: Date.now },
  },
  { _id: false }
);

/* --------------------------- Conversación ---------------------------- */

const ConversacionSchema = new Schema(
  {
    usuarioId: { type: String, required: true }, // uid del usuario o "invitado"
    expedienteId: { type: String, default: "default" },

    // Array ordenado cronológicamente
    mensajes: {
      type: [MensajeSchema],
      default: [],
    },
  },
  {
    collection: "conversaciones",
    timestamps: true, // createdAt / updatedAt automáticos
  }
);

// Índice para búsquedas rápidas por usuario+expediente
ConversacionSchema.index({ usuarioId: 1, expedienteId: 1 }, { unique: true });

const Conversacion =
  mongoose.models.Conversacion ||
  mongoose.model("Conversacion", ConversacionSchema);

export default Conversacion;
