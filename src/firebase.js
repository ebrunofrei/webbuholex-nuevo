import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, isSupported } from "firebase/messaging";

// --- Validación de variables de entorno ---
const requiredEnvVars = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
];

requiredEnvVars.forEach((key) => {
  if (!import.meta.env[key]) {
    console.warn(`⚠️ Falta la variable de entorno: ${key}`);
  }
});

// --- Configuración ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || undefined, // opcional
};

// --- Inicialización única ---
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// --- Servicios ---
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// ⚠️ Mensajería solo si está soportado en el navegador
let messaging;
(async () => {
  try {
    if (await isSupported()) {
      messaging = getMessaging(app);
    } else {
      console.warn("⚠️ Firebase Messaging no soportado en este navegador.");
    }
  } catch (error) {
    console.warn("⚠️ Error al verificar soporte de Firebase Messaging:", error);
  }
})();

export { app, auth, db, storage, messaging };
