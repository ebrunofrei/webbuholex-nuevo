// scripts/list-storage.js
import "dotenv/config";
import { db, auth, storage } from "../backend/services/myFirebaseAdmin.js";

async function main() {
  console.log("=== 📂 Listar archivos en Firebase Storage ===");

  try {
    const [files] = await storage.getFiles();
    if (!files.length) {
      console.log("⚠️ No hay archivos en el bucket.");
      return;
    }

    for (const file of files) {
      console.log(`- ${file.name}`);
    }
  } catch (err) {
    console.error("❌ Error listando archivos:", err.message);
  }
}

main();
