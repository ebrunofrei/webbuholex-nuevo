// backend/models/Jurisprudencia.js
// ============================================================
// 🦉 BúhoLex | Modelo unificado de Jurisprudencia (ENTERPRISE)
// ------------------------------------------------------------
// - Un solo documento (listado + detalle)
// - Normalización canónica en pre-validate
// - Dedupe: hash único + índice único parcial por (fuente,titulo,fechaResolucion)
// - Embeddings y trazabilidad de origen
// ============================================================

import mongoose from "mongoose";
import { normalizeJurisprudencia } from "../services/jurisprudenciaNormalizer.js";

const { Schema } = mongoose;

/* ----------------------------- helpers ----------------------------- */

function cleanString(v) {
  if (v === null || v === undefined) return "";
  return String(v).replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
}

function cleanArrayStrings(arr) {
  if (!Array.isArray(arr)) return [];
  const out = [];
  const seen = new Set();
  for (const it of arr) {
    const s = cleanString(it);
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

function safeDate(d) {
  if (!d) return null;
  try {
    const x = new Date(d);
    return Number.isNaN(x.getTime()) ? null : x;
  } catch {
    return null;
  }
}

function safeSet(doc, key, value) {
  // evita setear undefined y evita tocar _id
  if (key === "_id") return;
  if (value === undefined) return;
  doc.set(key, value, { strict: true });
}

/* ----------------------------- schema ----------------------------- */

const JurisprudenciaSchema = new Schema(
  {
    // =========================
    // 1) IDENTIFICADORES
    // =========================
    uuid: { type: String, default: "", index: true },
    hash: { type: String, unique: true, sparse: true, index: true },

    // =========================
    // 2) REFERENCIAS JUDICIALES
    // =========================
    numeroExpediente: { type: String, default: "", index: true },
    numeroProceso: { type: String, default: "" },

    recurso: { type: String, default: "", index: true },
    tipoResolucion: { type: String, default: "", index: true },

    // =========================
    // 3) ÓRGANO / CLASIFICACIÓN
    // =========================
    organo: { type: String, default: "", index: true },
    salaSuprema: { type: String, default: "" },
    instancia: { type: String, default: "" },

    especialidad: { type: String, default: "", index: true },
    materia: { type: String, default: "", index: true },
    tema: { type: String, default: "", index: true },
    subtema: { type: String, default: "", index: true },

    // =========================
    // 4) FECHAS
    // =========================
    fechaResolucion: { type: Date, default: null, index: true },
    fechaPublicacion: { type: Date, default: null },
    fechaScraping: { type: Date, default: Date.now, index: true },

    // =========================
    // 5) CONTENIDO (UI / LEGAL)
    // =========================
    titulo: { type: String, default: "", index: true },
    sumilla: { type: String, default: "" },
    resumen: { type: String, default: "" },
    resumenCorto: { type: String, default: "" },

    pretensionDelito: { type: String, default: "", index: true },
    normaDerechoInterno: { type: String, default: "" },

    palabrasClave: { type: [String], default: [] },

    fundamentos: { type: String, default: "" },
    parteResolutiva: { type: String, default: "" },
    baseLegal: { type: String, default: "" },

    // =========================
    // 6) CONTENIDO COMPLETO
    // =========================
    contenidoHTML: { type: String, default: "" },

    // Texto legacy / repositorio
    texto: { type: String, default: "" },

    // Texto de trabajo IA (no probatorio)
    textoIA: { type: String, default: "" },

    // Texto oficial (si lo guardas explícito)
    textoOficial: { type: String, default: "" },

    textQuality: {
      type: String,
      default: "sin_texto",
      enum: ["oficial", "extraccion_ia", "repositorio_general", "sin_texto"],
      index: true,
    },
    esTextoOficial: { type: Boolean, default: false },
    contextVersion: { type: Number, default: 2 },

    // =========================
    // 7) RECURSOS / FUENTES
    // =========================
    urlResolucion: { type: String, default: "" },
    pdfUrl: { type: String, default: "" },
    pdfOficialUrl: { type: String, default: "" },

    // para carga manual local (solo backend)
    pdfLocalPath: { type: String, default: "" },

    fuente: { type: String, default: "Poder Judicial", index: true },
    fuenteUrl: { type: String, default: "" },
    origen: { type: String, default: "JNS", index: true },

    // =========================
    // 8) ESTADO / FLAGS
    // =========================
    estado: { type: String, default: "Vigente", index: true },
    destacado: { type: Boolean, default: false, index: true },
    masCitada: { type: Boolean, default: false, index: true },
    citadaCount: { type: Number, default: 0, index: true },
    tags: { type: [String], default: [], index: true },

    // =========================
    // 9) EMBEDDINGS
    // =========================
    embedding: { type: [Number], default: undefined }, // undefined => “pendiente”
    embeddingModel: { type: String, default: "" },
    embeddingUpdatedAt: { type: Date, default: null },

    // =========================
    // 10) EXTRAS (SCRAPER)
    // =========================
    extra: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    minimize: false,
    strict: true,
  }
);

/* ----------------------------- virtuals ----------------------------- */

JurisprudenciaSchema.virtual("expediente").get(function () {
  return this.numeroExpediente;
});

JurisprudenciaSchema.virtual("pretension").get(function () {
  return this.pretensionDelito;
});

JurisprudenciaSchema.virtual("organoJurisdiccional").get(function () {
  return this.organo;
});

JurisprudenciaSchema.virtual("tieneTextoCompleto").get(function () {
  return !!(this.texto && this.texto.trim().length > 0);
});

JurisprudenciaSchema.virtual("tieneTextoIA").get(function () {
  return !!(this.textoIA && this.textoIA.trim().length > 0);
});

JurisprudenciaSchema.virtual("pdfUrlEfectivo").get(function () {
  return (
    (this.pdfOficialUrl && this.pdfOficialUrl.trim()) ||
    (this.pdfUrl && this.pdfUrl.trim()) ||
    (this.urlResolucion && this.urlResolucion.trim()) ||
    ""
  );
});

JurisprudenciaSchema.methods.getSafePdfUrl = function () {
  return this.pdfUrlEfectivo || "";
};

/* ------------------------ normalización hook ------------------------ */

JurisprudenciaSchema.pre("validate", function (next) {
  try {
    const plain = this.toObject({ depopulate: true, virtuals: false });

    // Limpieza mínima ANTES del normalizador
    plain.titulo = cleanString(plain.titulo);
    plain.fuente = cleanString(plain.fuente);
    plain.origen = cleanString(plain.origen);

    plain.fechaResolucion = safeDate(plain.fechaResolucion);
    plain.fechaPublicacion = safeDate(plain.fechaPublicacion);
    plain.fechaScraping = safeDate(plain.fechaScraping) || new Date();

    plain.tags = cleanArrayStrings(plain.tags);
    plain.palabrasClave = cleanArrayStrings(plain.palabrasClave);

    const { normalized } = normalizeJurisprudencia(plain);

    // Set seguro (no rompe strict / no toca _id)
    for (const [k, v] of Object.entries(normalized || {})) {
      safeSet(this, k, v);
    }

    next();
  } catch (err) {
    next(err);
  }
});

/* ----------------------------- índices ----------------------------- */

// Índice compuesto para listados
JurisprudenciaSchema.index(
  {
    origen: 1,
    especialidad: 1,
    materia: 1,
    tema: 1,
    fechaResolucion: -1,
    createdAt: -1,
  },
  { name: "juris_list_index" }
);

JurisprudenciaSchema.index(
  { citadaCount: -1, createdAt: -1 },
  { name: "juris_citada_index" }
);

JurisprudenciaSchema.index(
  { destacado: 1, fechaResolucion: -1 },
  { name: "juris_destacado_index" }
);

JurisprudenciaSchema.index(
  { createdAt: -1 },
  { name: "juris_created_index" }
);

// ✅ DEDUPE enterprise por (fuente,titulo,fechaResolucion) SOLO cuando hay fecha válida
JurisprudenciaSchema.index(
  { fuente: 1, titulo: 1, fechaResolucion: 1 },
  {
    name: "juris_dedupe_fuente_titulo_fecha",
    unique: true,
    partialFilterExpression: {
      fuente: { $type: "string", $ne: "" },
      titulo: { $type: "string", $ne: "" },
      fechaResolucion: { $type: "date" },
    },
  }
);

/* --------------------------- toJSON / toObject --------------------------- */

function transformOut(_doc, ret) {
  ret.id = String(ret._id || "");
  delete ret._id;
  delete ret.__v;
  return ret;
}

JurisprudenciaSchema.set("toJSON", { virtuals: true, transform: transformOut });
JurisprudenciaSchema.set("toObject", {
  virtuals: true,
  transform: transformOut,
});

/* -------------------------------- export -------------------------------- */

const Jurisprudencia =
  mongoose.models.Jurisprudencia ||
  mongoose.model("Jurisprudencia", JurisprudenciaSchema);

export default Jurisprudencia;
