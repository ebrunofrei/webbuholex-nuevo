import mongoose from "mongoose";

const AgendaEventSchema = new mongoose.Schema(
  {
    usuarioId: { type: String, required: true, index: true },

    // 🧠 Identidad canónica
    caseId: {
      type: String,
      required: true,
      index: true,
    },

    // ⚠️ Legacy / compat (NO usar en lógica nueva)
    expedienteId: {
      type: String,
      default: null,
      index: true,
    },

    // -------------------------------
    // Contenido humano
    // -------------------------------
    title: { type: String, required: true, trim: true },
    notes: { type: String, default: "" },
    description: { type: String, default: "" },

    // -------------------------------
    // Tiempo humano
    // -------------------------------
    startISO: { type: String, required: true },
    endISO: { type: String, required: true },

    // -------------------------------
    // Tiempo motor
    // -------------------------------
    startUnix: { type: Number, required: true, index: true },
    endUnix: { type: Number, required: true, index: true },
    dueLocalDay: { type: String, required: true, index: true },

    // -------------------------------
    // Zona / alertas
    // -------------------------------
    tz: { type: String, default: "America/Lima" },
    telefono: { type: String, default: "", trim: true },
    alertaWhatsapp: { type: Boolean, default: false },

    waSentAt: { type: Date, default: null, index: true },
    waRedNotifiedAt: { type: Date, default: null, index: true },
    waLastHash: { type: String, default: "" },

    // -------------------------------
    // Estado
    // -------------------------------
    status: {
      type: String,
      enum: ["active", "done", "canceled"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true, minimize: false }
);

// ===============================
// Índices enterprise
// ===============================
AgendaEventSchema.index({ usuarioId: 1, status: 1, dueLocalDay: 1, startUnix: 1 });
AgendaEventSchema.index({ usuarioId: 1, status: 1, startUnix: 1 });
AgendaEventSchema.index({ usuarioId: 1, status: 1, endUnix: 1 }); // 🔥 clave para alertas rojas (≤ 2h)
AgendaEventSchema.index({ usuarioId: 1, alertaWhatsapp: 1, status: 1, endUnix: 1 });

// ===============================
// Helpers internos (sin dependencias)
// ===============================
function isValidISO(s) {
  const d = new Date(String(s));
  return !Number.isNaN(d.getTime());
}
function toUnix(iso) {
  return Math.floor(new Date(String(iso)).getTime() / 1000);
}

// ===============================
// Blindaje: coherencia ISO ↔ Unix + notes unificado
// ===============================
AgendaEventSchema.pre("validate", function (next) {
  // 1) Unificar texto: notes es fuente única
  // - Si solo vino description (legacy), lo pasamos a notes
  if ((!this.notes || this.notes === "") && this.description) {
    this.notes = this.description;
  }
  // - Mantener description como espejo (legacy) para no romper clientes viejos
  if (this.notes && (!this.description || this.description === "")) {
    this.description = this.notes;
  }

  // 2) ISO -> Unix si falta o viene inválido
  if (this.startISO && isValidISO(this.startISO)) {
    if (this.startUnix == null) this.startUnix = toUnix(this.startISO);
  }
  if (this.endISO && isValidISO(this.endISO)) {
    if (this.endUnix == null) this.endUnix = toUnix(this.endISO);
  }

  // 3) dueLocalDay fallback (si el router no lo puso)
  if (this.startISO && (!this.dueLocalDay || this.dueLocalDay === "")) {
    this.dueLocalDay = String(this.startISO).slice(0, 10);
  }

  next();
});

// ===============================
// Validación fuerte (enterprise)
// ===============================
AgendaEventSchema.pre("save", function (next) {
  if (!this.title || !String(this.title).trim()) {
    return next(new Error("AgendaEvent: title requerido"));
  }
  if (!this.usuarioId || !String(this.usuarioId).trim()) {
    return next(new Error("AgendaEvent: usuarioId requerido"));
  }
  if (!this.startISO || !isValidISO(this.startISO)) {
    return next(new Error("AgendaEvent: startISO inválido"));
  }
  if (!this.endISO || !isValidISO(this.endISO)) {
    return next(new Error("AgendaEvent: endISO inválido"));
  }
  if (typeof this.startUnix !== "number" || typeof this.endUnix !== "number") {
    return next(new Error("AgendaEvent: startUnix/endUnix requeridos"));
  }
  if (this.endUnix < this.startUnix) {
    return next(new Error("AgendaEvent: endUnix no puede ser menor que startUnix"));
  }
  if (!this.dueLocalDay || !/^\d{4}-\d{2}-\d{2}$/.test(String(this.dueLocalDay))) {
    return next(new Error("AgendaEvent: dueLocalDay inválido (YYYY-MM-DD)"));
  }
  next();
});

export default mongoose.models.AgendaEvent || mongoose.model("AgendaEvent", AgendaEventSchema);
