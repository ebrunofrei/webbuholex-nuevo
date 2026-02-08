import mongoose from "mongoose";

const UsuarioSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    nombre: { type: String, default: "" },

    noticiasGuardadas: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Noticia" }
    ],

    favoritos: [{ type: String }],
    roles: [{ type: String, default: ["user"] }],

    // 🆕 Bubble Advanced Analysis Unlock
    analysisUnlock: {
      activeUntil: { type: Date, default: null },
      source: { type: String, default: null }, // one_time_payment | plan | admin
    },
  },
  { timestamps: true }
);

export default mongoose.models.Usuario ||
  mongoose.model("Usuario", UsuarioSchema);
