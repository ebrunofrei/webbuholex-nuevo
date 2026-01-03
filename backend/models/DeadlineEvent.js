import mongoose from "mongoose";

const DeadlineEventSchema = new mongoose.Schema(
  {
    // ===============================
    // Identidad
    // ===============================
    usuarioId: { type: String, required: true, index: true },
    expedienteId: { type: String, default: null, index: true },

    // ===============================
    // Contenido jurídico
    // ===============================
    title: { type: String, required: true, trim: true },
    notes: { type: String, default: "" },

    // ===============================
    // Fuente (enterprise)
    // ===============================
    // "plazo" = automático desde motor
    // "manual" = creado por usuario (en otro modelo normalmente)
    source: {
      type: String,
      enum: ["plazo", "manual"],
      default: "plazo",
      index: true,
    },

    // ✅ fingerprint idempotente para evitar duplicados
    fingerprint: { type: String, default: "", index: true },

    // ===============================
    // Vencimiento (fuente del motor)
    // ===============================
    endISO: { type: String, required: true },
    endUnix: { type: Number, required: true, index: true },

    // ===============================
    // Agenda inteligente
    // ===============================
    dueLocalDay: { type: String, required: true, index: true }, // YYYY-MM-DD
    dueLocalTime: { type: String, default: null }, // HH:mm:ss

    // ===============================
    // Metadatos de cálculo
    // ===============================
    tz: { type: String, default: "America/Lima" },
    country: { type: String, default: "PE" },

    domain: { type: String, default: "civil" },
    acto: { type: String, default: null },

    tipo: { type: String, default: "habiles" },
    cantidad: { type: Number, default: 0 },

    rulesetId: { type: String, default: null },

    // ===============================
    // Alertas / riesgo
    // ===============================
    minutesBefore: { type: Number, default: 120 },

    // ===============================
    // Control enterprise (NO revivir)
    // ===============================
    muted: { type: Boolean, default: false, index: true }, // si true: no se muestra / no revive

    // ===============================
    // Estado
    // ===============================
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
DeadlineEventSchema.index({ usuarioId: 1, status: 1, dueLocalDay: 1, endUnix: 1 });
DeadlineEventSchema.index({ usuarioId: 1, status: 1, endUnix: 1 });

// ✅ ÚNICO (idempotencia real) para plazos automáticos
DeadlineEventSchema.index(
  { usuarioId: 1, source: 1, fingerprint: 1 },
  { unique: true, partialFilterExpression: { fingerprint: { $type: "string", $ne: "" } } }
);

// ===============================
// Helpers internos
// ===============================
function isValidISO(s) {
  const d = new Date(String(s));
  return !Number.isNaN(d.getTime());
}
function toUnix(iso) {
  return Math.floor(new Date(String(iso)).getTime() / 1000);
}

// ===============================
// Blindaje mínimo + fingerprint fallback
// ===============================
DeadlineEventSchema.pre("validate", function (next) {
  // endISO -> endUnix
  if (this.endISO && (!this.endUnix || !Number.isFinite(this.endUnix))) {
    if (isValidISO(this.endISO)) this.endUnix = toUnix(this.endISO);
  }

  // dueLocalDay fallback
  if (this.endISO && (!this.dueLocalDay || this.dueLocalDay === "")) {
    this.dueLocalDay = String(this.endISO).slice(0, 10);
  }

  // fingerprint fallback (si viene vacío)
  if (!this.fingerprint) {
    const fp = [
      this.usuarioId || "",
      this.source || "plazo",
      this.caseId || "",
      this.expedienteId || "",
      this.domain || "",
      this.acto || "",
      this.rulesetId || "",
      this.tipo || "",
      String(this.cantidad ?? ""),
      String(this.endUnix ?? ""),
      this.dueLocalDay || "",
      String(this.title || "").trim().toLowerCase(),
    ].join("|");
    this.fingerprint = fp;
  }

  next();
});

export default mongoose.models.DeadlineEvent ||
  mongoose.model("DeadlineEvent", DeadlineEventSchema);
