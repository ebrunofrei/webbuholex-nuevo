// backend/models/OcrDocument.js
import mongoose from "mongoose";

const OcrDocumentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  filename: String,
  mimetype: String,
  text: String,
  sourceUrl: String,
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("OcrDocument", OcrDocumentSchema);
