// ============================================================================
// 📄 ExportVersion — Versionado de exportaciones jurídicas (C.3.2)
// ============================================================================

import mongoose from "mongoose";

const ExportVersionSchema = new mongoose.Schema(
  {
    caseId: { type: String, required: true },
    chatId: { type: String, required: true },

    type: {
      type: String,
      enum: ["WORD", "PDF"],
      required: true,
    },

    version: { type: Number, required: true },

    snapshotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DraftSnapshot",
      required: true,
    },

    file: {
      filename: String,
      path: String,
      mime: String,
      size: Number,
    },

    meta: {
      action: String,          // EXPORT_WORD / EXPORT_PDF
      generatedBy: String,     // userId
      tool: String,            // litisbot
    },
  },
  { timestamps: true }
);

export default mongoose.model("ExportVersion", ExportVersionSchema);
