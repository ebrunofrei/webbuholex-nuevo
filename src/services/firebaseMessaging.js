// /src/services/firebaseMessaging.js
import { messaging } from "@/firebase";
import {
  getToken,
  onMessage,
  deleteToken,
  isSupported as _isSupported,
} from "firebase/messaging";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

/** Cache de soporte */
let _supportCache = null;
/** Cache de token */
let _cachedToken = null;

/** Comprueba si Firebase Messaging está soportado en este navegador */
export async function isMessagingSupported() {
  if (_supportCache != null) return _supportCache;
  try {
    _supportCache = await _isSupported();
  } catch {
    _supportCache = false;
  }
  return _supportCache;
}

/** Asegura contexto seguro (https o localhost) */
function isSecureContextForFcm() {
  return (
    typeof window !== "undefined" &&
    (location.protocol === "https:" || location.hostname === "localhost")
  );
}

/** Registra el Service Worker de FCM (idempotente) */
async function registerFcmServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    console.warn("⚠️ Este navegador no soporta Service Workers.");
    return null;
  }
  if (!isSecureContextForFcm()) {
    console.warn("⚠️ FCM requiere HTTPS o localhost.");
    return null;
  }

  try {
    // Si ya hay un SW activo con firebase-messaging, reutilízalo
    const regs = await navigator.serviceWorker.getRegistrations();
    const existing = regs.find((r) =>
      r.active?.scriptURL?.includes("firebase-messaging-sw.js")
    );
    if (existing) {
      await navigator.serviceWorker.ready;
      return existing;
    }

    // Si no existe, registramos uno nuevo
    const reg = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js",
      { scope: "/" }
    );
    await navigator.serviceWorker.ready;
    console.log("✅ SW FCM registrado:", reg);
    return reg;
  } catch (err) {
    console.error("❌ Error registrando SW FCM:", err);
    return null;
  }
}

/** Pide permiso de notificaciones */
async function ensureNotificationPermission() {
  if (typeof Notification === "undefined") {
    console.warn("⚠️ API Notification no disponible en este entorno.");
    return false;
  }
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") {
    console.warn("⚠️ Permiso de notificaciones denegado por el usuario/navegador.");
    return false;
  }
  const result = await Notification.requestPermission();
  return result === "granted";
}

/**
 * Obtiene el token FCM.
 * @param {{ forceRefresh?: boolean, vapidKey?: string }} [opts]
 */
export async function solicitarPermisoYToken(opts = {}) {
  try {
    // Saltar en local si no quieres ruido en desarrollo
    if (window.location.hostname === "localhost") {
      console.warn("⚠️ FCM deshabilitado en localhost.");
      return null;
    }

    // 1) Soporte
    const supported = await isMessagingSupported();
    if (!supported) {
      console.warn("⚠️ Firebase Messaging no soportado en este navegador.");
      return null;
    }
    if (!messaging) {
      console.error("❌ 'messaging' no está inicializado desde '@/firebase'.");
      return null;
    }

    // 2) Service Worker + permisos
    const swReg = await registerFcmServiceWorker();
    if (!swReg) return null;

    const granted = await ensureNotificationPermission();
    if (!granted) return null;

    // 3) Token (usa cache si no forceRefresh)
    if (!opts.forceRefresh && _cachedToken) return _cachedToken;

    const token = await getToken(messaging, {
      vapidKey: opts.vapidKey || VAPID_KEY,
      serviceWorkerRegistration: swReg,
    });

    if (!token) {
      console.warn("⚠️ No se pudo obtener token FCM.");
      return null;
    }

    _cachedToken = token;
    console.log("✅ TOKEN FCM:", token);
    return token;
  } catch (err) {
    console.error("❌ Error al obtener token FCM:", err);
    return null;
  }
}

/** Elimina token FCM actual */
export async function borrarTokenFcm() {
  try {
    const ok = await deleteToken(messaging);
    if (ok) {
      console.log("🗑️ Token FCM eliminado.");
      _cachedToken = null;
    }
    return ok;
  } catch (err) {
    console.error("❌ Error al eliminar token FCM:", err);
    return false;
  }
}

/** Escucha mensajes en foreground */
export function listenToForegroundMessages(onMessageCallback) {
  const supportedPromise = isMessagingSupported();

  supportedPromise.then((supported) => {
    if (!supported || !messaging) {
      console.warn("⚠️ Foreground listener no habilitado.");
      return;
    }
    try {
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log("📩 Notificación en foreground:", payload);
        onMessageCallback?.(payload);
      });
      listenToForegroundMessages.unsubscribe = unsubscribe;
    } catch (err) {
      console.error("❌ Error en listenToForegroundMessages:", err);
    }
  });

  return () => {
    try {
      listenToForegroundMessages.unsubscribe?.();
    } catch {}
  };
}
