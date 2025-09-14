// backend/services/firebaseAdmin.js
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import admin from "firebase-admin";

// --- Inicializa solo una vez ---
if (!getApps().length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    // Decodifica la variable Base64 a JSON
    const serviceAccount = JSON.parse(
      Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf8")
    );

    initializeApp({
      credential: cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
  } else {
    throw new Error("❌ Falta la variable FIREBASE_SERVICE_ACCOUNT_BASE64 en el entorno");
  }
}

// --- Instancias únicas ---
const db = getFirestore();
const auth = getAuth();

// --- Exporta todo desde aquí ---
export { admin, db, auth };
