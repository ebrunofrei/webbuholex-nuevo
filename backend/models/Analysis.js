import mongoose from "mongoose";
const { Schema, model, Types } = mongoose;

const AnalysisSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },

    // puede existir sin caso (global), pero tú hoy lo usarás por caseId
    caseId: { type: Types.ObjectId, ref: "Case", default: null, index: true },

    title: { type: String, trim: true, maxlength: 200, default: "Análisis" },

    status: {
      type: String,
      enum: ["activo", "archivado"],
      default: "activo",
      index: true,
    },

    archivedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false }
);

AnalysisSchema.index({ userId: 1, caseId: 1, updatedAt: -1 });

export default model("Analysis", AnalysisSchema);
