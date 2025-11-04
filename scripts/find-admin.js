import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const servicePath = path.resolve(__dirname, "../backend/services/myFirebaseAdmin.js");

const { db, auth, storage } = await import(servicePath);

// script principal
async function main() {
  console.log("=== 📂 Listar archivos en Firebase Storage ===");
  try {
    const [files] = await storage.getFiles({ maxResults: 10 });
    if (!files.length) {
      console.log("⚠️ No hay archivos en el bucket.");
      return;
    }
    for (const file of files) {
      console.log(`📄 ${file.name}`);
    }
  } catch (err) {
    console.error("❌ Error listando archivos:", err.message);
  }
}

main();
