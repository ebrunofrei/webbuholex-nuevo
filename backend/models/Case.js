// models/Case.js
import mongoose from "mongoose";

const CaseSchema = new mongoose.Schema(
  {
    usuarioId: { type: String, required: true, index: true },
    titulo: { type: String, default: "Caso sin título" },
    descripcion: { type: String, default: "" },
    estado: {
      type: String,
      enum: ["activo", "archivado"],
      default: "activo",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Case", CaseSchema);
