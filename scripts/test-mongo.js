// /scripts/test-mongo.js
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar el .env que está en /backend/.env
dotenv.config({ path: path.resolve(__dirname, "../backend/.env") });

const uri = process.env.MONGO_URI;
console.log("🔎 MONGO_URI leído:", uri);

if (!uri) {
  console.error("❌ No se encontró MONGO_URI en el .env de backend");
  process.exit(1);
}

const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    console.log("✅ Conexión exitosa a MongoDB Atlas");
    const db = client.db("buholex");
    const collections = await db.listCollections().toArray();
    console.log("📂 Colecciones:", collections.map(c => c.name));
  } catch (err) {
    console.error("❌ Error de conexión:", err);
  } finally {
    await client.close();
  }
}

run();
