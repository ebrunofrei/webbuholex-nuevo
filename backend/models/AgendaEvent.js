import mongoose from "mongoose";

/**
 * ============================================================
 * 🗓️ AgendaEvent — CANONICAL MODEL (AGENDA LIBRE REAL)
 * ============================================================
 * - Agenda manual y agenda IA conviven
 * - usuarioId = identidad obligatoria
 * - expedienteId = scope opcional (case_<id>)
 * - NO se persisten alias conversacionales
 * ============================================================
 */

const AgendaEventSchema = new mongoose.Schema(
  {
    // ========================================================
    // 🔐 Identidad
    // ========================================================
    usuarioId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    /**
     * Scope opcional de agenda
     * case_<id> | null (agenda libre)
     */
    expedienteId: {
      type: String,
      default: null,
      index: true,
      trim: true,
    },

    // ========================================================
    // 📝 Contenido
    // ========================================================
    title: {
      type: String,
      required: true,
      trim: true,
    },

    notes: {
      type: String,
      default: "",
    },

    // Legacy espejo (NO fuente)
    description: {
      type: String,
      default: "",
    },

    // ========================================================
    // 🕓 Tiempo
    // ========================================================
    startISO: { type: String, required: true },
    endISO: { type: String, required: true },

    startUnix: { type: Number, required: true, index: true },
    endUnix: { type: Number, required: true, index: true },

    dueLocalDay: {
      type: String,
      required: true,
      index: true,
    },

    // ========================================================
    // 🌍 Zona / alertas
    // ========================================================
    tz: {
      type: String,
      default: "America/Lima",
    },

    telefono: { type: String, default: "", trim: true },
    alertaWhatsapp: { type: Boolean, default: false },

    waSentAt: { type: Date, default: null },
    waRedNotifiedAt: { type: Date, default: null },
    waLastHash: { type: String, default: "" },

    // ========================================================
    // 📌 Estado
    // ========================================================
    status: {
      type: String,
      enum: ["active", "done", "canceled"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true }
);

// ============================================================
// 🔎 Índices (flexibles)
// ============================================================
AgendaEventSchema.index({
  usuarioId: 1,
  status: 1,
  dueLocalDay: 1,
  startUnix: 1,
});

AgendaEventSchema.index({
  usuarioId: 1,
  expedienteId: 1,
  status: 1,
  dueLocalDay: 1,
});

// ============================================================
// 🛡️ Normalización mínima (NO negocio)
// ============================================================
AgendaEventSchema.pre("validate", function (next) {
  if (!this.notes && this.description) this.notes = this.description;
  if (this.notes && !this.description) this.description = this.notes;
  next();
});

export default mongoose.models.AgendaEvent ||
  mongoose.model("AgendaEvent", AgendaEventSchema);
