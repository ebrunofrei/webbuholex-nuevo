import { MongoClient } from "mongodb";

const uri = process.env.MONGO_URI;
if (!uri) throw new Error("⚠️ Falta MONGO_URI en .env");

const client = new MongoClient(uri, { useUnifiedTopology: true });

let db;
export async function getDb() {
  if (!db) {
    await client.connect();
    db = client.db(process.env.MONGO_DB || "buholex");
    console.log("✅ Conectado a MongoDB");
  }
  return db;
}
