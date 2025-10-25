// models/Mensaje.js
// ===============================================
// 💬 Modelo Mensaje de Chat para LitisBot / BúhoLex
// Guarda cada interacción (usuario y asistente)
// ===============================================

import mongoose from "mongoose";

const MensajeSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true, // para filtrar rápido por usuario
    },
    rol: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    texto: {
      type: String,
      required: true,
      trim: true,
    },
    // contexto opcional: ej. "Expediente 045-2024 alimentos", "Cliente Juan Pérez", etc.
    contexto: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true, // crea createdAt y updatedAt
  }
);

// Índice compuesto opcional para consultas tipo "dame últimos mensajes de X":
MensajeSchema.index({ userId: 1, createdAt: -1 });

const Mensaje = mongoose.models.Mensaje || mongoose.model("Mensaje", MensajeSchema);

export default Mensaje;
