// src/firebase.js
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

// --- Configuración desde .env.local ---
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// --- Validación mínima (para que no intente iniciar con config vacía) ---
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

// --- FCM: inicialización perezosa ---
let messaging = null;

/** Registra el SW de FCM si existe en /public */
export const registerFcmServiceWorker = async () => {
  try {
    if (!("serviceWorker" in navigator)) return null;
    const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    return reg;
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
    if (!("Notification" in window)) {
      console.warn("⚠️ FCM omitido: navegador no soporta Notificaciones.");
      return null;
    }
    if (!(await isSupported())) {
      console.warn("⚠️ FCM omitido: Firebase Messaging no soportado en este entorno.");
      return null;
    }

    await registerFcmServiceWorker();
    messaging = getMessaging(app);
    console.log("✅ Firebase Messaging inicializado");
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
    if (!messaging) return null;
    const vapidKey = import.meta.env.VITE_FCM_VAPID_KEY || undefined;
    const token = await getToken(messaging, vapidKey ? { vapidKey } : undefined);
    return token || null;
  } catch (e) {
    console.warn("⚠️ No se obtuvo token FCM:", e?.message || e);
    return null;
  }
};

/** Listener seguro para mensajes en foreground */
export const onForegroundMessage = (cb) => {
  if (!messaging) {
    return () => {}; // devuelve unsub no-op
  }
  return onMessage(messaging, cb);
};

// --- Exportar todo ---
export {
  app,
  db,
  auth,
  storage,
  messaging, // puede ser null y está bien

  // Firestore
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  addDoc,
  arrayUnion,
  arrayRemove,
  deleteDoc,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  orderBy,
  limit,
  startAfter,

  // Storage
  ref,
  uploadBytes,
  deleteObject,
  getDownloadURL,

  // Auth
  onAuthStateChanged,

  // Messaging base (compatibilidad)
  getToken,
  onMessage,
};
