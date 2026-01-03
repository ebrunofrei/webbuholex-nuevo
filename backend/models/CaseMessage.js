import mongoose from "mongoose";

const { Schema, model, Types } = mongoose;

const AttachmentSchema = new Schema(
  {
    type: {
      type: String,
      trim: true, // pdf, image, docx, etc.
    },
    name: {
      type: String,
      trim: true,
    },
    url: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const CaseMessageSchema = new Schema(
  {
    caseId: {
      type: Types.ObjectId,
      ref: "CaseSession",
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
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Índices importantes para performance
CaseMessageSchema.index({ caseId: 1, createdAt: 1 });

export default model("CaseMessage", CaseMessageSchema);
