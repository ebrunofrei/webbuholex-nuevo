import mongoose from "mongoose";

const BubbleUsageSchema = new mongoose.Schema(
  {
    usuarioId: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true }, // YYYY-MM-DD
    count: { type: Number, default: 0 },
  },
  { timestamps: true }
);

BubbleUsageSchema.index({ usuarioId: 1, date: 1 }, { unique: true });

export default mongoose.model("BubbleUsage", BubbleUsageSchema);
