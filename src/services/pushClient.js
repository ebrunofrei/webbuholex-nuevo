// ============================================================
// 🦉 BÚHOLEX | Push Client (FCM en navegador)
// - Se inicializa SOLO si: https + ENABLE_PUSH=true
// - Registra el SW y obtiene token con VAPID
// - Silencioso si falla (no rompe app)
// ============================================================

import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

const ENABLE_PUSH = (import.meta?.env?.VITE_ENABLE_PUSH ?? "false").toLowerCase() === "true";
const VAPID = import.meta?.env?.VITE_FCM_VAPID_KEY || ""; // p.ej. BExxx...

const firebaseConfig = {
  apiKey:        import.meta?.env?.VITE_FIREBASE_API_KEY,
  authDomain:    import.meta?.env?.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:     import.meta?.env?.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta?.env?.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta?.env?.VITE_FIREBASE_SENDER_ID,
  appId:         import.meta?.env?.VITE_FIREBASE_APP_ID,
  measurementId: import.meta?.env?.VITE_FIREBASE_MEASUREMENT_ID,
};

// Evita doble init
let _started = false;

export async function initPushClient({ swUrl = "/firebase-messaging-sw.js", enablePushParam = "false" } = {}) {
  // ✅ Gates de seguridad (no molestar en http, dev, iOS Safari, etc.)
  if (_started) return;
  if (!ENABLE_PUSH) return;
  if (typeof window === "undefined") return;
  if (location.protocol !== "https:") return;
  if (!("serviceWorker" in navigator)) return;

  _started = true;

  try {
    // 1) Soporte de FCM en este navegador
    const supported = await isSupported().catch(() => false);
    if (!supported) return;

    // 2) Registrar SW con flag para activar/desactivar (combina con tu SW nuevo)
    const reg = await navigator.serviceWorker.register(
      `${swUrl}?enablePush=${encodeURIComponent(enablePushParam)}`,
      { scope: "/" }
    );

    // 3) Inicializar Firebase
    const app = initializeApp(firebaseConfig);

    // 4) Messaging y token (con VAPID)
    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey: VAPID, serviceWorkerRegistration: reg })
      .catch(() => null);

    // Guarda/manda el token si quieres
    if (token) {
      // TODO: envía token a tu backend si corresponde
      // await apiFetch(`/push/register?token=${encodeURIComponent(token)}`);
      console.info("[Push] Token FCM obtenido.");
    } else {
      console.info("[Push] Sin token (permiso denegado o VAPID faltante).");
    }

    // 5) Mensajes en foreground (opcional)
    onMessage(messaging, (payload) => {
      // Puedes disparar un toast o badge aquí
      console.debug("[Push] onMessage:", payload);
    });
  } catch (e) {
    // Silencioso: no romper UI por FCM
    console.debug("[Push] init ignorado:", e?.message || e);
  }
}
