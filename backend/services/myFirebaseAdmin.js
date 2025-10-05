import { initializeApp, cert, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
import fs from "fs";
import path from "path";

// --- Cargar credenciales desde archivo o fallback a applicationDefault ---
let serviceAccount = null;

try {
  const filePath = path.resolve("backend/firebase-service-account.json");
  if (fs.existsSync(filePath)) {
    serviceAccount = JSON.parse(fs.readFileSync(filePath, "utf8"));
    console.log("✅ Credenciales Firebase cargadas desde archivo JSON");
  }
} catch (err) {
  console.error("⚠️ Error leyendo archivo de credenciales Firebase:", err.message);
}

const adminApp =
  getApps().length === 0
    ? initializeApp(
        serviceAccount
          ? { credential: cert(serviceAccount), storageBucket: process.env.FIREBASE_STORAGE_BUCKET }
          : { credential: applicationDefault(), storageBucket: process.env.FIREBASE_STORAGE_BUCKET }
      )
    : getApps()[0];

// --- Exporta servicios ---
const db = getFirestore(adminApp);
const auth = getAuth(adminApp);
const storage = getStorage(adminApp);

export { db, auth, storage };
