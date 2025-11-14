// backend/models/Jurisprudencia.js
// ============================================================
// 🦉 BúhoLex | Modelo unificado de Jurisprudencia
// - Diseñado para JNS (Poder Judicial) y futuras fuentes (TC, Plenos, etc.)
// - Guarda listado + ficha completa en un solo documento
// - Pensado para filtros clásicos + búsqueda semántica (embeddings)
// ============================================================

import mongoose from "mongoose";

const { Schema } = mongoose;

/* ----------------------------- helpers básicos ---------------------------- */

function cleanString(v) {
  if (!v) return "";
  return String(v).trim();
}

function cleanArrayStrings(arr) {
  if (!arr) return [];
  return Array.from(
    new Set(
      arr
        .map((s) => String(s || "").trim())
        .filter((s) => s.length > 0)
    )
  );
}

/* --------------------------------- schema -------------------------------- */

const JurisprudenciaSchema = new Schema(
  {
    // Identificadores base
    uuid: { type: String, index: true }, // ej. id interno de JNS si lo tenemos
    recurso: { type: String, default: "" }, // "Casación", "Recurso de Nulidad", etc.
    numeroExpediente: { type: String, index: true }, // "702-2019", "1234-2020-LIMA", etc.
    numeroProceso: { type: String, default: "" }, // si la fuente lo distingue
    tipoResolucion: { type: String, index: true }, // "Sentencia", "Auto", etc.

    // Órgano / estructura judicial
    salaSuprema: { type: String, default: "" },
    organo: { type: String, index: true }, // usado también en el frontend
    instancia: { type: String, default: "" }, // "Suprema", "Superior", etc.
    especialidad: { type: String, index: true }, // Civil, Penal, Const., etc.
    tema: { type: String, index: true },
    subtema: { type: String, index: true },

    // Datos de tiempo
    fechaResolucion: { type: Date, index: true },
    fechaPublicacion: { type: Date },
    fechaScraping: { type: Date, default: Date.now, index: true },

    // Contenido jurídico
    titulo: { type: String, index: true }, // título human-readable
    sumilla: { type: String },
    resumen: { type: String },
    pretensionDelito: { type: String, index: true },
    normaDerechoInterno: { type: String },
    palabrasClave: { type: [String], default: [] }, // array limpio
    fundamentos: { type: String }, // fundamentos destacados, si se extraen
    parteResolutiva: { type: String },
    baseLegal: { type: String },

    // Contenido bruto / HTML de la ficha
    contenidoHTML: { type: String }, // ficha completa en HTML limpio

    // Recursos externos
    urlResolucion: { type: String }, // enlace directo al PDF o servletdescarga
    fuente: { type: String, default: "Poder Judicial", index: true }, // "JNS", "TC", etc.
    fuenteUrl: { type: String }, // url pública de la ficha original

    // Estado / flags
    estado: { type: String, default: "Vigente", index: true }, // "Vigente", "No vigente", etc.
    destacado: { type: Boolean, default: false, index: true },
    masCitada: { type: Boolean, default: false, index: true },
    tags: { type: [String], default: [] }, // internos: ["interno", "jns", "pro"] etc.

    // Hash antifraude/duplicados (listado+detalle)
    hash: { type: String, unique: true, sparse: true, index: true },

    // Campo libre para extras del scraper (por si JNS cambia)
    extra: { type: Schema.Types.Mixed },

    // (Opcional) vector embeddings para búsquedas semánticas
    // NO obligatorio; solo si estás usando Atlas Vector Search u otro motor
    // embedVector: { type: [Number], index: "2dsphere" | "vector" según motor },
  },
  {
    timestamps: true, // createdAt / updatedAt
  }
);

/* ---------------------------- normalización hook -------------------------- */

JurisprudenciaSchema.pre("save", function (next) {
  // this = doc
  this.recurso = cleanString(this.recurso);
  this.numeroExpediente = cleanString(this.numeroExpediente);
  this.numeroProceso = cleanString(this.numeroProceso);
  this.tipoResolucion = cleanString(this.tipoResolucion);
  this.salaSuprema = cleanString(this.salaSuprema);
  this.organo = cleanString(this.organo);
  this.instancia = cleanString(this.instancia);
  this.especialidad = cleanString(this.especialidad);
  this.tema = cleanString(this.tema);
  this.subtema = cleanString(this.subtema);
  this.titulo = cleanString(this.titulo);
  this.sumilla = cleanString(this.sumilla);
  this.resumen = cleanString(this.resumen);
  this.pretensionDelito = cleanString(this.pretensionDelito);
  this.normaDerechoInterno = cleanString(this.normaDerechoInterno);
  this.fundamentos = cleanString(this.fundamentos);
  this.parteResolutiva = cleanString(this.parteResolutiva);
  this.baseLegal = cleanString(this.baseLegal);
  this.urlResolucion = cleanString(this.urlResolucion);
  this.fuente = cleanString(this.fuente);
  this.fuenteUrl = cleanString(this.fuenteUrl);
  this.estado = cleanString(this.estado);
  this.palabrasClave = cleanArrayStrings(this.palabrasClave);
  this.tags = cleanArrayStrings(this.tags);
  next();
});

/* ------------------------------- índices ---------------------------------- */

// Texto completo básico (opcional, depende de tu estrategia de búsqueda clásica)
JurisprudenciaSchema.index(
  {
    titulo: "text",
    sumilla: "text",
    resumen: "text",
    pretensionDelito: "text",
    normaDerechoInterno: "text",
    palabrasClave: "text",
  },
  {
    name: "juris_text_index",
    default_language: "spanish",
  }
);

// Filtros frecuentes ya están marcados como index en los campos definidos arriba

/* --------------------------- toJSON / toObject ---------------------------- */

JurisprudenciaSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

JurisprudenciaSchema.set("toObject", {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

/* --------------------------------- export -------------------------------- */

const Jurisprudencia =
  mongoose.models.Jurisprudencia ||
  mongoose.model("Jurisprudencia", JurisprudenciaSchema);

export default Jurisprudencia;
