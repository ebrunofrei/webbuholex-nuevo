// ============================================================================
// 🔐 Firebase Admin — Inicialización Canónica (BúhoLex)
// ----------------------------------------------------------------------------
// - SOLO autenticación y servicios auxiliares
// - MongoDB sigue siendo la base de dominio
// - Inicialización única (singleton)
// ============================================================================

import admin from "firebase-admin";
import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// 📌 Cargar credenciales (archivo local → fallback ADC)
// ---------------------------------------------------------------------------

let credentialConfig = null;

try {
  const filePath = path.resolve("backend/firebase-service-account.json");

  if (fs.existsSync(filePath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(filePath, "utf8"));
    credentialConfig = admin.credential.cert(serviceAccount);
    console.log("✅ Firebase Admin: credenciales cargadas desde JSON");
  } else {
    console.warn("⚠️ Firebase Admin: usando Application Default Credentials");
    credentialConfig = admin.credential.applicationDefault();
  }
} catch (err) {
  console.error("❌ Error cargando credenciales Firebase:", err.message);
  credentialConfig = admin.credential.applicationDefault();
}

// ---------------------------------------------------------------------------
// 🚀 Inicializar app (singleton real)
// ---------------------------------------------------------------------------

if (!admin.apps.length) {
  admin.initializeApp({
    credential: credentialConfig,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

// ---------------------------------------------------------------------------
// 🧩 Servicios derivados
// ---------------------------------------------------------------------------

const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();

// ---------------------------------------------------------------------------
// ✅ Exportaciones canónicas
// ---------------------------------------------------------------------------

export default admin;
export { db, auth, storage };
