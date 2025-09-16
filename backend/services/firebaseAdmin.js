// backend/services/firebaseAdmin.js
import { initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";

// Para evitar inicializar la app más de una vez en serverless (Vercel)
const app = !global._firebaseAdminApp
  ? initializeApp({
      credential: applicationDefault(), // Usa GOOGLE_APPLICATION_CREDENTIALS o la cred en base64
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    })
  : global._firebaseAdminApp;

// Guardar referencia global (fix para Vercel hot reload / serverless)
if (!global._firebaseAdminApp) {
  global._firebaseAdminApp = app;
}

// Inicializar servicios
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { db, auth, storage };
