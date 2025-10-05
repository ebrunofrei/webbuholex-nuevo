import mongoose from "mongoose";

const UsuarioSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, unique: true }, // UID de Auth
    email: { type: String, required: true, unique: true },
    nombre: { type: String, default: "" },

    // Noticias guardadas (referencias a la colección Noticia)
    noticiasGuardadas: [{ type: mongoose.Schema.Types.ObjectId, ref: "Noticia" }],

    // Otros campos extensibles
    favoritos: [{ type: String }],
    roles: [{ type: String, default: ["user"] }],
  },
  { timestamps: true }
);

// 👇 Ya no definimos index duplicados: unique:true crea el índice automáticamente

export default mongoose.models.Usuario || mongoose.model("Usuario", UsuarioSchema);
