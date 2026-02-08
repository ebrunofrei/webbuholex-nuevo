import mongoose from "mongoose";

const { Schema, model, Types } = mongoose;

const AttachmentSchema = new Schema(
  {
    type: { type: String, trim: true },
    name: { type: String, trim: true },
    url: { type: String, trim: true },
  },
  { _id: false }
);

const AnalysisMessageSchema = new Schema(
  {
    analysisId: {
      type: Types.ObjectId,
      ref: "CaseSession", // análisis = sesión
      required: true,
      index: true,
    },

    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },

    content: {
      type: String,
      required: true,
      trim: true,
    },

    attachments: {
      type: [AttachmentSchema],
      default: [],
    },

    source: {
      type: String,
      enum: ["human", "ai"],
      default: "human",
    },
  },
  {
    timestamps: true, // createdAt = momento jurídico
    versionKey: false,
  }
);

// Índice crítico para auditoría
AnalysisMessageSchema.index({ analysisId: 1, createdAt: 1 });

export default model("AnalysisMessage", AnalysisMessageSchema);
