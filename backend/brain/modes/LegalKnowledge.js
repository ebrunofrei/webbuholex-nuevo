// backend/models/LegalKnowledge.js
// ============================================================
// 📚 LITISBOT KNOWLEDGE BASE (FASE 2)
// ------------------------------------------------------------
// Guarda fuentes de alta calidad provenientes del motor SEC-LITIS.
// Se vuelve la memoria estructurada del bot para futuras consultas.
// ============================================================

import mongoose from "mongoose";

const LegalKnowledgeSchema = new mongoose.Schema(
  {
    // Consulta original del usuario
    query: { type: String, index: true },

    // Query normalizada para búsquedas internas
    normalizedQuery: { type: String, index: true },

    // Dominio y URL de la fuente
    url: { type: String, required: true, unique: true },
    host: { type: String, index: true },

    // Texto visible
    title: String,
    snippet: String,

    // Texto completo (opcional, para una fase de scraping posterior)
    fullText: String,

    // Clasificación automática
    sourceType: {
      type: String,
      enum: [
        "jurisprudencia",
        "normativa",
        "doctrina",
        "ciencia",
        "filosofia",
        "psicologia",
        "tecnica",
        "economia",
        "general",
      ],
      default: "general",
    },

    // Jurisdicción / país aplicable (si la podemos inferir)
    jurisdiccion: { type: String, index: true },

    // Materia jurídica o científica detectada
    materia: { type: String, index: true },

    // Palabras clave automáticas
    keywords: [String],

    // Score SEC-LITIS
    trustScore: { type: Number, default: 0.75 },

    // Flags de calidad
    autoIndexed: { type: Boolean, default: true }, // viene del bot, no a mano
    verified: { type: Boolean, default: false },   // para revisar manualmente luego
  },
  { timestamps: true }
);

// Índice de texto para búsquedas semánticas simples
LegalKnowledgeSchema.index({ title: "text", snippet: "text", fullText: "text" });

export default mongoose.models.LegalKnowledge ||
  mongoose.model("LegalKnowledge", LegalKnowledgeSchema);
