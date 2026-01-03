import mongoose from "mongoose";

const { Schema, model, Types } = mongoose;

const CaseSessionSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },

    title: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "Caso jurídico",
    },

    jurisdiction: {
      type: String,
      trim: true,
      maxlength: 50, // PE, MX, ES, US, etc.
    },

    area: {
      type: String,
      trim: true,
      maxlength: 50, // civil, penal, adm, etc.
    },

    status: {
      type: String,
      enum: ["abierto", "archivado"],
      default: "abierto",
      index: true,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
    versionKey: false,
  }
);

// Índices compuestos útiles
CaseSessionSchema.index({ userId: 1, createdAt: -1 });

export default model("CaseSession", CaseSessionSchema);
