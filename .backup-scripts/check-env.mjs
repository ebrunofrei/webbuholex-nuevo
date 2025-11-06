// scripts/check-env.mjs
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const requiredVars = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
  "VITE_FIREBASE_MEASUREMENT_ID",
  "VITE_GOOGLE_CLIENT_ID",
  "OPENAI_API_KEY",
  "CULQI_PRIVATE_KEY",
  "TWILIO_SID",
  "TWILIO_TOKEN",
  "TWILIO_WHATSAPP_NUMBER",
  "VITE_API_URL",
];

const missing = requiredVars.filter((v) => !process.env[v]);

if (missing.length > 0) {
  console.error("❌ Variables de entorno faltantes:");
  missing.forEach((v) => console.error(`   - ${v}`));
  process.exit(1); // Detener ejecución si falta algo
} else {
  console.log("✅ Todas las variables de entorno están definidas.");
}
