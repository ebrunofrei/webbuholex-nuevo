// backend/models/FuenteLegal.js
// ============================================================
// 🧾 Modelo FuenteLegal
// ------------------------------------------------------------
// Unifica TODO lo que LitisBot va a usar como contexto:
//  - noticias, jurisprudencia, normas, doctrina, boletines, etc.
// ============================================================

import mongoose from "mongoose";

const { Schema } = mongoose;

const FuenteLegalSchema = new Schema(
  {
    // Tipo de fuente
    tipo: {
      type: String,
      enum: ["noticia", "jurisprudencia", "norma", "doctrina", "boletin", "otro"],
      default: "otro",
      index: true,
    },

    // Identificador lógico de la fuente: corteidh_boletines, pj_jurisprudencia, etc.
    fuenteId: {
      type: String,
      index: true,
    },

    // Nombre legible de la fuente: "Corte IDH", "Poder Judicial", "El Peruano", etc.
    fuente: {
      type: String,
      index: true,
    },

    // Título principal a mostrar
    titulo: {
      type: String,
      required: true,
      index: "text",
    },

    // Resumen corto / extracto
    resumen: {
      type: String,
    },

    // URL de la fuente (PDF, noticia, norma, etc.)
    url: {
      type: String,
      index: true,
    },

    // Fecha de la fuente (no confundir con fechaRegistro)
    fecha: {
      type: String, // ISO string o fecha formateada (flexible)
      index: true,
    },

    // Campos específicos para jurisprudencia
    numeroExpediente: { type: String, index: true },
    organo: { type: String, index: true },
    sala: { type: String, index: true },
    materia: { type: String, index: true },
    subMateria: { type: String },
    jurisdiccion: { type: String, index: true }, // Perú, Interamericano, etc.
    pais: { type: String, index: true },

    // Campos específicos para normas
    numeroNorma: { type: String, index: true },
    tipoNorma: { type: String, index: true }, // Ley, DS, RM, etc.

    // 🔮 Campos IA (clasificación de LitisBot)
    relevancia: {
      type: String,
      enum: ["alta", "media", "baja"],
      default: "media",
      index: true,
    },
    premium: {
      type: Boolean,
      default: false,
      index: true,
    },
    tagsAI: {
      type: [String],
      default: [],
      index: true,
    },
    recomendacionIA: {
      type: String,
    },
    jurisprudenciaRelacionada: {
      type: [String],
      default: [],
    },
    escribeResumenIA: {
      type: String,
    },

    // Auditoría
    creadoPor: {
      type: String,
      default: "LitisBotOrquestador",
    },
    fechaRegistro: {
      type: Date,
      default: Date.now,
      index: true,
    },
    actualizadoEn: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // Identificador hash opcional para evitar duplicados
    hashId: {
      type: String,
      index: { unique: true, sparse: true },
    },
  },
  {
    collection: "fuentes_legales",
    timestamps: false,
  }
);

// Índices compuestos recomendados
FuenteLegalSchema.index({ tipo: 1, relevancia: 1, fechaRegistro: -1 });
FuenteLegalSchema.index({ tipo: 1, materia: 1, fechaRegistro: -1 });

const FuenteLegal =
  mongoose.models.FuenteLegal || mongoose.model("FuenteLegal", FuenteLegalSchema);

export default FuenteLegal;
