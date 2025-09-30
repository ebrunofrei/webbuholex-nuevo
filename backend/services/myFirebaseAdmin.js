// backend/services/myFirebaseAdmin.js
import { initializeApp, cert, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";

// --- Inicializa Firebase Admin ---
let serviceAccount = null;

if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
  serviceAccount = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf8")
  );
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
