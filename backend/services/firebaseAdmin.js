// backend/services/firebaseAdmin.js
import { getApps, initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import admin from "firebase-admin";

// --- Inicializa solo una vez ---
if (!getApps().length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    initializeApp({
      credential: applicationDefault(),
    });
  }
}

// --- Instancias únicas ---
const db = getFirestore();
const auth = getAuth();

// --- Exporta todo desde aquí ---
export { admin, db, auth };
