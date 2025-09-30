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

// --- Helper para acceder a las vars de entorno ---
// Usa import.meta.env en navegador (Vite)
// y process.env en Node (cuando corres scripts con dotenv)
const getEnv = (key) => {
  if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  return process.env[key];
};

// --- Config desde .env.local ---
const firebaseConfig = {
  apiKey:            getEnv("VITE_FIREBASE_API_KEY"),
  authDomain:        getEnv("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId:         getEnv("VITE_FIREBASE_PROJECT_ID"),
  storageBucket:     getEnv("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId:             getEnv("VITE_FIREBASE_APP_ID"),
  measurementId:     getEnv("VITE_FIREBASE_MEASUREMENT_ID"),
};

// --- Validación mínima para inicializar ---
const HAS_CORE =
  Boolean(firebaseConfig.apiKey) &&
  Boolean(firebaseConfig.projectId) &&
  Boolean(firebaseConfig.appId);

// --- Inicializar app solo si hay config ---
const app = HAS_CORE
  ? (getApps().length ? getApp() : initializeApp(firebaseConfig))
  : null;

// --- Servicios principales ---
const db      = app ? getFirestore(app) : null;
const auth    = app ? getAuth(app)      : null;
const storage = app ? getStorage(app)   : null;

// --- FCM: inicialización segura ---
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

/** Inicializa Firebase Messaging (solo si es soportado) */
export const initMessaging = async () => {
  try {
    if (!app || !HAS_CORE) {
      console.warn("⚠️ FCM omitido: configuración Firebase incompleta.");
      return null;
    }
    if (typeof window === "undefined") {
      console.warn("⚠️ FCM omitido: entorno sin window (Node).");
      return null;
    }
    if (!("Notification" in window)) {
      console.warn("⚠️ FCM omitido: el navegador no soporta Notificaciones.");
      return null;
    }
    if (!(await isSupported())) {
      console.warn("⚠️ FCM omitido: Firebase Messaging no soportado aquí.");
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

/** Obtiene token FCM de forma segura */
export const getFcmToken = async () => {
  try {
    if (!messaging) await initMessaging();
    if (!messaging) return null;
    const vapidKey = getEnv("VITE_FIREBASE_VAPID_KEY") || undefined;
    const token = await getToken(messaging, vapidKey ? { vapidKey } : undefined);
    return token || null;
  } catch (e) {
    console.warn("⚠️ No se obtuvo token FCM:", e?.message || e);
    return null;
  }
};

/** Listener de mensajes en foreground */
export const onForegroundMessage = (cb) => {
  if (!messaging) {
    return () => {};
  }
  return onMessage(messaging, cb);
};

// --- Exportar todo ---
export {
  app,
  db,
  auth,
  storage,
  messaging, // puede ser null

  // firestore
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

  // storage
  ref,
  uploadBytes,
  deleteObject,
  getDownloadURL,

  // auth
  onAuthStateChanged,

  // messaging base (por compatibilidad)
  getToken,
  onMessage,
};
