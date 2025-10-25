// backend/models/Mensaje.js
// ============================================================
// 💬 Log de Mensajes de LitisBot / BúhoLex
// Uso: auditoría y trazabilidad fina
// - Cada fila = un mensaje enviado o respondido
// - Esto NO es lo que el front usa para reconstruir contexto;
//   para eso usamos Conversacion.js con el array mensajes.
// - Aquí guardamos evidencia legal (quién dijo qué, cuándo).
// ============================================================

import mongoose from "mongoose";

const MensajeAuditoriaSchema = new mongoose.Schema(
  {
    // ----- Identidad / caso -----
    usuarioId: {
      type: String,
      required: true,
      index: true, // búsquedas por usuario
    },
    expedienteId: {
      type: String,
      default: "default",
      index: true, // búsquedas por expediente
    },

    // ----- Rol -----
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
      index: true,
    },

    // ----- Contenido bruto entregado/vuelto -----
    content: {
      type: String,
      required: true,
      trim: true,
    },

    // ----- Metadatos jurídicos/contextuales -----
    intencion: {
      type: String,
      enum: [
        "redaccion",
        "analisis_juridico",
        "traduccion",
        "consulta_general",
        null,
      ],
      default: null,
      index: true,
    },

    materiaDetectada: {
      type: String,
      default: null, // "civil", "penal", etc.
      index: true,
    },

    idioma: {
      type: String,
      default: "es-PE", // ej. es-PE, qu-PE, ay-BO, en-US
    },

    pais: {
      type: String,
      default: "Perú",
    },

    // opcional: para trazabilidad interna o tagging manual
    contexto: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true, // createdAt / updatedAt
    collection: "mensajes_auditoria",
  }
);

// Índice compuesto: ver últimos mensajes de un expediente concreto rápido
MensajeAuditoriaSchema.index(
  { usuarioId: 1, expedienteId: 1, createdAt: -1 },
  { name: "idx_usuario_expediente_ts" }
);

// Índice para buscar todos los mensajes del bot en materia laboral, etc.
MensajeAuditoriaSchema.index(
  { role: 1, materiaDetectada: 1, createdAt: -1 },
  { name: "idx_role_materia_ts" }
);

const Mensaje =
  mongoose.models.Mensaje ||
  mongoose.model("Mensaje", MensajeAuditoriaSchema);

export default Mensaje;
