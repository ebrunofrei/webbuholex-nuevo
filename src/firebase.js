// src/firebase.js
import "dotenv/config"; // asegura que .env.local se lea en Node también

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

// --- Helper universal (sirve en Vite y Node) ---
const getEnv = (key) =>
  (typeof import.meta !== "undefined" && import.meta.env?.[key]) || process.env[key];

// --- Configuración desde .env ---
const firebaseConfig = {
  apiKey:            getEnv("VITE_FIREBASE_API_KEY"),
  authDomain:        getEnv("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId:         getEnv("VITE_FIREBASE_PROJECT_ID"),
  storageBucket:     getEnv("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId:             getEnv("VITE_FIREBASE_APP_ID"),
  measurementId:     getEnv("VITE_FIREBASE_MEASUREMENT_ID"),
};

// --- Validación mínima ---
const HAS_CORE =
  Boolean(firebaseConfig.apiKey) &&
  Boolean(firebaseConfig.projectId) &&
  Boolean(firebaseConfig.appId);

// --- Inicializar app ---
const app = HAS_CORE
  ? (getApps().length ? getApp() : initializeApp(firebaseConfig))
  : null;

// --- Servicios principales ---
const db      = app ? getFirestore(app) : null;
const auth    = app ? getAuth(app)      : null;
const storage = app ? getStorage(app)   : null;

// --- FCM: inicialización perezosa y segura ---
let messaging = null;
let swRegistration = null;

/** Registra el SW de FCM (una sola vez) */
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

/** Inicializa Firebase Messaging de forma segura */
export const initMessaging = async () => {
  try {
    if (!app || !HAS_CORE) {
      console.warn("⚠️ FCM omitido: configuración Firebase incompleta.");
      return null;
    }
    if (typeof window === "undefined" || !("Notification" in window)) {
      console.warn("⚠️ FCM omitido: este entorno no soporta Notificaciones.");
      return null;
    }
    if (!(await isSupported())) {
      console.warn("⚠️ FCM omitido: Firebase Messaging no soportado.");
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

/** Solicita token de FCM de forma segura */
export const getFcmToken = async () => {
  try {
    if (!messaging) await initMessaging();
    if (!messaging || !swRegistration) return null;

    const vapidKey = getEnv("VITE_FIREBASE_VAPID_KEY");
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swRegistration,
    });

    if (token) {
      console.log("🎟️ Token FCM obtenido:", token);
      return token;
    }
    return null;
  } catch (e) {
    console.warn("⚠️ No se obtuvo token FCM:", e?.message || e);
    return null;
  }
};

/** Listener seguro para mensajes en foreground */
export const onForegroundMessage = (cb) => {
  if (!messaging) {
    return () => {}; // unsub no-op
  }
  return onMessage(messaging, cb);
};

// --- Exportar todo ---
export {
  app,
  db,
  auth,
  storage,
  messaging, // puede ser null hasta que se ejecute initMessaging
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
