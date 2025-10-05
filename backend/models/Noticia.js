// ============================================================
// 🦉 BÚHOLEX | Modelo de Noticia (versión corregida)
// ============================================================
// Define el esquema y los índices para noticias en MongoDB.
// Optimizado para rendimiento sin índices duplicados.
// ============================================================

import mongoose from "mongoose";

const NoticiaSchema = new mongoose.Schema(
  {
    titulo: {
      type: String,
      required: true,
      trim: true,
    },
    resumen: {
      type: String,
      default: "",
      trim: true,
    },
    contenido: {
      type: String,
      default: "",
      trim: true,
    },
    fuente: {
      type: String,
      default: "Desconocida",
      trim: true,
      index: true, // ✅ deja este, elimina la declaración manual más abajo
    },
    url: {
      type: String,
      required: true,
      unique: true, // 🔒 asegura unicidad real
      trim: true,
    },
    imagen: {
      type: String,
      default: null,
    },
    tipo: {
      type: String,
      enum: ["juridica", "general", "ciencia", "tecnologia"],
      default: "general",
      index: true,
    },
    especialidad: {
      type: String,
      default: "general",
      trim: true,
      index: true,
    },
    fecha: {
      type: Date,
      default: Date.now,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
    collection: "noticias",
  }
);

// 🧠 Índices compuestos optimizados
NoticiaSchema.index({ tipo: 1, especialidad: 1, fecha: -1 });
NoticiaSchema.index({ titulo: "text", resumen: "text" }); // 🔍 búsqueda por texto

// 🔁 Actualización automática de updatedAt
NoticiaSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export const Noticia =
  mongoose.models.Noticia || mongoose.model("Noticia", NoticiaSchema);
