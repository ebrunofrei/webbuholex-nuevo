// src/firebase.js
// 🚫 Nada de dotenv en frontend: solo import.meta.env

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore, doc, getDoc, setDoc, collection, query, where,
  getDocs, updateDoc, addDoc, arrayUnion, arrayRemove, deleteDoc,
  onSnapshot, Timestamp, serverTimestamp, orderBy, limit, startAfter,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  getStorage, ref, uploadBytes, deleteObject, getDownloadURL,
} from "firebase/storage";
import {
  getMessaging, isSupported, getToken, onMessage,
} from "firebase/messaging";

// =========================
// Helper env universal
// =========================
const getEnv = (key) =>
  (typeof import.meta !== "undefined" && import.meta.env?.[key]) || undefined;

// =========================
// Configuración Firebase
// =========================
const firebaseConfig = {
  apiKey:            getEnv("VITE_FIREBASE_API_KEY"),
  authDomain:        getEnv("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId:         getEnv("VITE_FIREBASE_PROJECT_ID"),
  storageBucket:     getEnv("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId:             getEnv("VITE_FIREBASE_APP_ID"),
  measurementId:     getEnv("VITE_FIREBASE_MEASUREMENT_ID"),
};

// =========================
// Validación mínima
// =========================
const HAS_CORE =
  Boolean(firebaseConfig.apiKey) &&
  Boolean(firebaseConfig.projectId) &&
  Boolean(firebaseConfig.appId);

if (!HAS_CORE) {
  console.warn("⚠️ Firebase config incompleta. Verifica variables .env");
}

// =========================
// Inicialización App
// =========================
const app = HAS_CORE
  ? (getApps().length ? getApp() : initializeApp(firebaseConfig))
  : null;

// =========================
// Servicios principales
// =========================
const db      = app ? getFirestore(app) : null;
const auth    = app ? getAuth(app)      : null;
const storage = app ? getStorage(app)   : null;

// =========================
// Firebase Cloud Messaging
// =========================
let messaging = null;
let swRegistration = null;

/** Registra SW de FCM */
export const registerFcmServiceWorker = async () => {
  try {
    if (!("serviceWorker" in navigator)) return null;
    if (swRegistration) return swRegistration;

    swRegistration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    await navigator.serviceWorker.ready;

    console.log("✅ SW FCM registrado:", swRegistration);
    return swRegistration;
  } catch (e) {
    console.warn("⚠️ FCM SW no registrado:", e?.message || e);
    return null;
  }
};

/** Inicializa Firebase Messaging */
export const initMessaging = async () => {
  try {
    if (!app || !HAS_CORE) {
      console.warn("⚠️ FCM omitido: configuración Firebase incompleta.");
      return null;
    }
    if (getEnv("VITE_ENABLE_FCM") === "false") {
      console.info("ℹ️ FCM deshabilitado por config.");
      return null;
    }
    if (typeof window === "undefined" || !("Notification" in window)) {
      console.warn("⚠️ FCM omitido: entorno sin soporte de notificaciones.");
      return null;
    }
    if (!(await isSupported())) {
      console.warn("⚠️ FCM no soportado en este navegador.");
      return null;
    }

    await registerFcmServiceWorker();
    if (!messaging) {
      messaging = getMessaging(app);
      console.log("✅ Firebase Messaging inicializado");
    }
    return messaging;
  } catch (err) {
    console.error("❌ Error inicializando Messaging:", err);
    return null;
  }
};

/** Solicita token de FCM */
export const getFcmToken = async () => {
  try {
    if (!messaging) await initMessaging();
    if (!messaging || !swRegistration) return null;

    const vapidKey = getEnv("VITE_FIREBASE_VAPID_KEY");
    if (!vapidKey) {
      console.warn("⚠️ No se configuró VITE_FIREBASE_VAPID_KEY");
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swRegistration,
    });

    if (token) {
      console.log("🎟️ Token FCM obtenido:", token);
      return token;
    } else {
      console.warn("⚠️ Usuario no otorgó permisos de notificación.");
      return null;
    }
  } catch (e) {
    console.warn("⚠️ No se obtuvo token FCM:", e?.message || e);
    return null;
  }
};

/** Listener de mensajes en foreground */
export const onForegroundMessage = (cb) => {
  if (!messaging) {
    console.warn("⚠️ Listener FCM ignorado: messaging no inicializado.");
    return () => {};
  }
  return onMessage(messaging, cb);
};

// =========================
// Exportar todo
// =========================
export {
  app,
  db,
  auth,
  storage,
  messaging, // puede ser null hasta initMessaging()
  swRegistration,

  // Firestore
  doc, getDoc, setDoc, collection, query, where,
  getDocs, updateDoc, addDoc, arrayUnion, arrayRemove, deleteDoc,
  onSnapshot, Timestamp, serverTimestamp, orderBy, limit, startAfter,

  // Storage
  ref, uploadBytes, deleteObject, getDownloadURL,

  // Auth
  onAuthStateChanged,

  // Messaging base
  getToken,
  onMessage,
};
