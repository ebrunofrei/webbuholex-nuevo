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

/**
 * Normaliza un valor a string recortado.
 * Devuelve "" si viene null/undefined.
 */
function cleanString(v) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return s.trim();
}

/**
 * Normaliza arrays de strings:
 * - Convierte todo a string
 * - Hace trim
 * - Elimina vacíos
 * - Elimina duplicados
 */
function cleanArrayStrings(arr) {
  if (!Array.isArray(arr)) return [];
  return Array.from(
    new Set(
      arr
        .map((s) => (s === null || s === undefined ? "" : String(s).trim()))
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
    materia: { type: String, index: true },
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
    texto: { type: String }, // versión "plain text" para búsquedas/clasificación

    // Recursos externos
    urlResolucion: { type: String }, // enlace directo al PDF o servletdescarga
    pdfUrl: { type: String }, 
    fuente: { type: String, default: "Poder Judicial", index: true }, // "JNS", "TC", etc.
    fuenteUrl: { type: String }, // url pública de la ficha original

    // Opcional, pero muy útil para distinguir origen interno
    origen: { type: String, default: "JNS", index: true }, // "JNS", "TC", "dummy", etc.

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
    // embedVector: { type: [Number], index: "vector" | "2dsphere" según motor },
  },
  {
    timestamps: true, // createdAt / updatedAt
  }
);

/* ---------------------------- normalización hook -------------------------- */

JurisprudenciaSchema.pre("save", function (next) {
  // Identificadores
  this.recurso = cleanString(this.recurso);
  this.numeroExpediente = cleanString(this.numeroExpediente);
  this.numeroProceso = cleanString(this.numeroProceso);
  this.tipoResolucion = cleanString(this.tipoResolucion);

  // Órgano / estructura judicial
  this.salaSuprema = cleanString(this.salaSuprema);
  this.organo = cleanString(this.organo);
  this.instancia = cleanString(this.instancia);
  this.especialidad = cleanString(this.especialidad);
  this.materia = cleanString(this.materia);
  this.tema = cleanString(this.tema);
  this.subtema = cleanString(this.subtema);

  // Contenido jurídico
  this.titulo = cleanString(this.titulo);
  this.sumilla = cleanString(this.sumilla);
  this.resumen = cleanString(this.resumen);
  this.pretensionDelito = cleanString(this.pretensionDelito);
  this.normaDerechoInterno = cleanString(this.normaDerechoInterno);
  this.fundamentos = cleanString(this.fundamentos);
  this.parteResolutiva = cleanString(this.parteResolutiva);
  this.baseLegal = cleanString(this.baseLegal);

  // Contenido bruto
  this.contenidoHTML = cleanString(this.contenidoHTML);
  this.texto = cleanString(this.texto);

  // Recursos externos
  this.urlResolucion = cleanString(this.urlResolucion);
  // pdfUrl prioriza su propio valor, y si viene vacío hereda de urlResolucion
  this.pdfUrl = cleanString(this.pdfUrl || this.urlResolucion);

  this.fuente = cleanString(this.fuente || "Poder Judicial");
  this.fuenteUrl = cleanString(this.fuenteUrl);

  // Origen interno del registro (JNS, TC, dummy, etc.)
  this.origen = cleanString(this.origen || "JNS");

  // Estado / tags
  this.estado = cleanString(this.estado || "Vigente");

  this.palabrasClave = cleanArrayStrings(this.palabrasClave);
  this.tags = cleanArrayStrings(this.tags);

  next();
});


/* ------------------------------- índices ---------------------------------- */

// Texto completo básico
JurisprudenciaSchema.index(
  {
    titulo: "text",
    sumilla: "text",
    resumen: "text",
    pretensionDelito: "text",
    normaDerechoInterno: "text",
    palabrasClave: "text",
    materia: "text",
    texto: "text",
  },
  {
    name: "juris_text_index",
    default_language: "spanish",
  }
);

// Los campos más usados ya tienen index: numeroExpediente, organo, especialidad,
// materia, tema, subtema, fechaResolucion, fechaScraping, fuente, estado, etc.

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
