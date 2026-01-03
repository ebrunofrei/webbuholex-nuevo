// ======================================================================
// 🧾 DraftSnapshot — Borradores cognitivos del análisis jurídico
// ----------------------------------------------------------------------
// - Snapshot intencional
// - No automático
// - No versionado implícito
// ======================================================================

import mongoose from "mongoose";

const DraftSnapshotSchema = new mongoose.Schema(
  {
    caseId: {
      type: String,
      required: true,
      index: true,
    },

    chatId: {
      type: String,
      required: true,
      index: true,
    },

    createdBy: {
      type: String,
      required: true,
      index: true,
    },

    snapshot: {
      type: Object,
      required: true,
    },

    meta: {
      cognitiveMode: String,
      materia: String,
      pais: String,
    },

    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    versionKey: false,
  }
);

export default mongoose.model("DraftSnapshot", DraftSnapshotSchema);
