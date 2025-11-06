// backend/models/Noticia.js
import mongoose from "mongoose";

/* ------------------------- Helpers ------------------------- */
const normArray = (arr) =>
  Array.from(new Set((arr || []).map((s) => String(s || "").trim().toLowerCase()).filter(Boolean)));

const hostFromUrl = (u = "") => {
  try {
    const h = new URL(String(u)).hostname || "";
    return h.replace(/^www\./i, "");
  } catch {
    return "";
  }
};

const normFuente = (raw = "", enlace = "") => {
  const base = String(raw || "").trim().toLowerCase();
  const host = hostFromUrl(enlace);
  let f = base || host;

  f = (f || "")
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\.(pe|com|org|net|es)$/g, "")
    .replace(/noticias$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  // Alias locales
  if (f === "pj" || f === "pjudicial" || /poder\s*judicial/.test(f)) f = "poder judicial";
  if (f === "tc" || /tribunal\s*constitucional/.test(f)) f = "tribunal constitucional";
  if (/^gaceta juridica|gacetajuridica$/.test(f)) f = "gaceta juridica";
  if (f === "legis" || f === "legispe" || /legis\.pe/.test(f)) f = "legis.pe";
  if (f === "sunarp") f = "sunarp";
  if (f === "corte idh" || f === "cidh") f = "corte idh";
  if (f === "cij" || /icj/.test(f)) f = "cij";
  if (f === "tjue" || /curia|europa\.eu/.test(f)) f = "tjue";
  if (/oea/.test(f)) f = "oea";
  if (/onu/.test(f) || f === "onu noticias" || /news\.un\.org/.test(host)) f = "onu noticias";
  if (/elperuano|diario oficial el peruano/.test(f)) f = "el peruano";

  // Alias internacionales
  if (/theguardian|guardian/.test(f)) f = "guardian";
  if (/nytimes|nyt/.test(f)) f = "nyt";
  if (/reuters/.test(f)) f = "reuters";
  if (/elpais|el\s*pais/.test(f)) f = "el pais";

  if (!f && host) f = host.replace(/\.(pe|com|org|net|es)$/g, "");
  return f || "desconocido";
};

/* ------------------------- Schema ------------------------- */
const NoticiaSchema = new mongoose.Schema(
  {
    titulo: { type: String, required: true, trim: true },
    resumen: { type: String, default: "", trim: true },
    contenido: { type: String, default: "", trim: true },

    fuente: { type: String, default: "", trim: true },         // Ej: "Poder Judicial"
    fuenteNorm: { type: String, default: "", index: true },    // Normalizada p/ filtros
    enlace: { type: String, default: "", trim: true },

    imagen: { type: String, default: "", trim: true },
    imagenResuelta: { type: String, default: "", trim: true },

    fecha: { type: Date, default: Date.now, index: true },

    tipo: {
      type: String,
      enum: ["juridica", "general"],
      default: "general",
      lowercase: true,
      trim: true,
      index: true,
    },
    especialidad: {
      type: String,
      default: "general",
      lowercase: true,
      trim: true,
      index: true,
    },
    tema: { type: [String], default: [], set: normArray, index: true },

    lang: { type: String, default: "es", lowercase: true, trim: true },

    // compat
    especialidadSlug: { type: String, select: false },
  },
  { timestamps: true }
);

/* ------------------------- Hooks ------------------------- */
NoticiaSchema.pre("validate", function (next) {
  if (this.fuente) this.fuente = String(this.fuente).trim();
  if (this.enlace) this.enlace = String(this.enlace).trim();
  if (this.especialidadSlug && !this.especialidad) {
    this.especialidad = String(this.especialidadSlug).trim().toLowerCase();
  }
  if (this.especialidad) this.especialidad = String(this.especialidad).trim().toLowerCase();
  if (this.lang) this.lang = String(this.lang).trim().toLowerCase();
  if (Array.isArray(this.tema)) this.tema = normArray(this.tema);

  this.fuenteNorm = normFuente(this.fuente, this.enlace);

  if (!this.tipo || !["juridica", "general"].includes(this.tipo)) {
    const juridicos = new Set([
      "poder judicial",
      "tribunal constitucional",
      "sunarp",
      "jnj",
      "gaceta juridica",
      "legis.pe",
      "corte idh",
      "cij",
      "tjue",
      "oea",
      "onu noticias",
      "el peruano",
      "ministerio publico",
    ]);
    this.tipo = juridicos.has(this.fuenteNorm) ? "juridica" : "general";
  }
  next();
});

/* ------------------------- Indexes ------------------------- */
// Texto (único)
NoticiaSchema.index(
  { titulo: "text", resumen: "text", contenido: "text", fuente: "text" },
  { name: "noticia_text_idx" }
);

// Orden frecuentes
NoticiaSchema.index({ fecha: -1, _id: -1 });

// Consultas típicas
NoticiaSchema.index({ tipo: 1, especialidad: 1, fecha: -1 });
NoticiaSchema.index({ tipo: 1, fecha: -1 });
NoticiaSchema.index({ fuenteNorm: 1, fecha: -1 });
NoticiaSchema.index({ tipo: 1, lang: 1, fecha: -1 });

// ÚNICO parcial por enlace (solo si enlace no es vacío)
NoticiaSchema.index(
  { enlace: 1 },
  { unique: true, partialFilterExpression: { enlace: { $type: "string", $exists: true, $ne: "" } } }
);

/* ------------------------- Export ------------------------- */
export default mongoose.models.Noticia || mongoose.model("Noticia", NoticiaSchema);
