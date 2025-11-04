// scripts/seed-dummy.js
import mongoose from "mongoose";
import Usuario from "../backend/models/Usuario.js";
import { Noticia } from "../backend/models/Noticia.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/buholex";

async function seedDummy() {
  try {
    console.log("🔍 Conectando a MongoDB...");
    await mongoose.connect(MONGO_URI, { dbName: "buholex" });

    // Crear usuario dummy
    const user = await Usuario.findOneAndUpdate(
      { uid: "dummy" },
      { uid: "dummy", email: "dummy@test.com", nombre: "Usuario Dummy" },
      { upsert: true, new: true }
    );
    console.log("👤 Usuario dummy listo:", user.email);

    // Crear noticia dummy
    const noticia = await Noticia.findOneAndUpdate(
      { enlace: "http://test.com" },
      {
        titulo: "Noticia de prueba",
        contenido: "Esta es una noticia dummy para verificar índices.",
        fuente: "Test",
        enlace: "http://test.com",
        tipo: "general",
        fecha: new Date(),
        autor: "Sistema",
        etiquetas: ["dummy", "test"],
      },
      { upsert: true, new: true }
    );
    console.log("📰 Noticia dummy lista:", noticia.titulo);

    await mongoose.disconnect();
    console.log("✅ Seed completado. Ya puedes correr `scripts/check-indexes.js`.");
  } catch (err) {
    console.error("❌ Error en seed:", err.message);
    process.exit(1);
  }
}

seedDummy();
