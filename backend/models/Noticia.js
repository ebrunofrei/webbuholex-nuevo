// backend/models/Noticia.js
import mongoose from "mongoose";

// -------------------------------
// Normalizador para arrays de strings (tema)
// -------------------------------
const normArray = (arr) =>
  Array.from(
    new Set(
      (arr || [])
        .map((s) => String(s || "").trim().toLowerCase())
        .filter(Boolean)
    )
  );

const NoticiaSchema = new mongoose.Schema(
  {
    // ===========================
    // Contenido principal
    // ===========================
    titulo: { type: String, required: true, trim: true },
    resumen: { type: String, default: "", trim: true },
    contenido: { type: String, default: "", trim: true },

    // ===========================
    // Metadatos de procedencia
    // ===========================
    fuente: { type: String, default: "", trim: true }, // p.ej. "Poder Judicial"
    enlace: {
      type: String,
      default: "",
      trim: true,
      // Útil para evitar duplicados por URL. Sparse para no bloquear docs sin URL.
      index: { unique: false, sparse: true },
    },
    imagen: { type: String, default: "", trim: true },

    // ===========================
    // Fechas
    // ===========================
    fecha: { type: Date, default: Date.now },

    // ===========================
    // Claves de filtrado
    // ===========================
    tipo: {
      type: String,
      enum: ["juridica", "general"],
      default: "general",
      lowercase: true,
      trim: true,
      index: true,
    },

    // ⚠️ Para NOTICIAS JURÍDICAS (filtro por especialidad en UI/Oficina Virtual)
    especialidad: {
      type: String,
      default: "general",
      lowercase: true,
      trim: true,
      index: true,
    },

    // ⚠️ Para NOTICIAS GENERALES (botón flotante): temas (array)
    tema: {
      type: [String],
      default: [],
      set: normArray,
      index: true,
    },

    lang: {
      type: String,
      default: "es",
      lowercase: true,
      trim: true,
      // No añadir otro índice simple; abajo hay compuestos
    },

    // Compat suave (no se expone): por si el scraper viejo manda 'especialidadSlug'
    // No se indexa, solo para mapeo en pre-validate.
    especialidadSlug: { type: String, select: false },
  },
  { timestamps: true }
);

/* ======================================
   Hooks de saneo / compatibilidad
   ====================================== */

// Asegura lower/trim y compat con especialidadSlug
NoticiaSchema.pre("validate", function (next) {
  // titulo obligatorio ya lo valida Mongoose
  if (this.fuente) this.fuente = String(this.fuente).trim();
  if (this.enlace) this.enlace = String(this.enlace).trim();

  // Compat: si llega especialidadSlug y no hay especialidad, mapea
  if (!this.especialidad && this.especialidadSlug) {
    this.especialidad = String(this.especialidadSlug).trim().toLowerCase();
  }

  // Normaliza especialidad
  if (this.especialidad) {
    this.especialidad = String(this.especialidad).trim().toLowerCase();
  }

  // Normaliza lang
  if (this.lang) {
    this.lang = String(this.lang).trim().toLowerCase();
  }

  // Normaliza tema (usa setter, pero por si vienen mutaciones directas)
  if (Array.isArray(this.tema)) {
    this.tema = normArray(this.tema);
  }

  return next();
});

/* ===========================
   Índices recomendados
   =========================== */

// ÚNICO índice de texto (no dupliques). Incluye 'fuente' para búsquedas libres.
NoticiaSchema.index(
  { titulo: "text", resumen: "text", contenido: "text", fuente: "text" },
  { name: "noticia_text_idx" }
);

// Ordenación frecuente por fecha (y desempate por _id)
NoticiaSchema.index({ fecha: -1, _id: -1 });

// Compuestos para queries típicas
NoticiaSchema.index({ tipo: 1, especialidad: 1, fecha: -1 }); // Jurídicas por especialidad
NoticiaSchema.index({ tipo: 1, fecha: -1 });                   // Listado general por tipo
NoticiaSchema.index({ fuente: 1, fecha: -1 });                  // Por proveedor/fuente
NoticiaSchema.index({ tipo: 1, lang: 1, fecha: -1 });           // Filtro por idioma + tipo

// Export seguro (evita recompilar el modelo en hot-reload)
export default mongoose.models.Noticia ||
  mongoose.model("Noticia", NoticiaSchema);
