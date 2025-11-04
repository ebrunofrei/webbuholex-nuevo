// scripts/test-db.js
import { connectDB, disconnectDB } from "../backend/services/db.js";
import mongoose from "mongoose";

async function testDB() {
  console.log("=== 🧪 Test conexión MongoDB ===");

  try {
    await connectDB();

    // Obtener listado de colecciones como prueba
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log("📂 Colecciones disponibles:", collections.map(c => c.name));

    console.log("✅ Conexión probada correctamente.");
  } catch (err) {
    console.error("❌ Error en testDB:", err.message);
  } finally {
    await disconnectDB();
  }
}

testDB();
