import { initializeApp, getApps, getApp } from "@/firebase";
import { getAuth } from "@/firebase";
import { getFirestore } from "@/firebase";
import { getStorage } from "@/firebase";
import { getMessaging, isSupported } from "@/firebase";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || undefined,
};

// Inicializa solo si no hay apps previas
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

let messaging = null;
(async () => {
  try {
    if (await isSupported()) {
      messaging = getMessaging(app);
    }
  } catch (e) {
    console.warn("⚠️ Messaging no soportado:", e.message);
  }
})();

export { app, auth, db, storage, messaging };
