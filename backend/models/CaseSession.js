import mongoose from "mongoose";

const { Schema, model, Types } = mongoose;

const CaseSessionSchema = new Schema(
  {
    // 🔑 CONTEXTO PADRE
    caseId: {
      type: Types.ObjectId,
      ref: "Case",
      required: true,
      index: true,
    },

    // 🔑 PROPIETARIO
    userId: {
      type: String,
      required: true,
      index: true,
    },

    // 🧠 ANÁLISIS
    title: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "Análisis jurídico",
    },

    jurisdiction: {
      type: String,
      trim: true,
      maxlength: 50,
    },

    area: {
      type: String,
      trim: true,
      maxlength: 50,
    },

    status: {
      type: String,
      enum: ["abierto", "archivado"],
      default: "abierto",
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Índices útiles (performance + orden)
CaseSessionSchema.index({ userId: 1, caseId: 1, createdAt: -1 });

export default model("CaseSession", CaseSessionSchema);
