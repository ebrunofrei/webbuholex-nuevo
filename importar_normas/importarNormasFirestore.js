import { db } from "../services/myFirebaseAdmin.js";
import normas from "./csvjson.json" assert { type: "json" };

async function importarNormas() {
  try {
    for (const norma of normas) {
      await db.collection("normas_eleperuano").add(norma);
      console.log("✔️ Norma agregada:", norma.titulo || norma.nombre || "(sin título)");
    }
    console.log("✅ Importación finalizada");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error al importar normas:", err.message);
    process.exit(1);
  }
}

importarNormas();
