// src/firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
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
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  getStorage,
  ref,              // 👈 agregado solo aquí
  uploadBytes,
  deleteObject,
  getDownloadURL,
} from "firebase/storage";
import {
  getMessaging,
  isSupported,
  getToken,
  onMessage,
} from "firebase/messaging";

// --- Configuración ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// ✅ Inicializar solo si no hay apps previas (evita error de duplicado)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// --- Servicios principales ---
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// --- Inicialización segura de Messaging ---
let messaging = null;
(async () => {
  if (await isSupported()) {
    messaging = getMessaging(app);
  }
})();

// --- Exportar todo sin duplicados ---
export {
  app,
  db,
  auth,
  storage,
  messaging,
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
  ref,             // 👈 ref ahora viene solo de storage
  uploadBytes,
  deleteObject,
  getDownloadURL,
  // auth
  onAuthStateChanged,
  // messaging
  getToken,
  onMessage,
};
