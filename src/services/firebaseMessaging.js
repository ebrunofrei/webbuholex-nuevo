// src/services/firebaseMessaging.js
import { initMessaging, getFcmToken, registerFcmServiceWorker } from "@/firebase";
import {
  getToken,
  onMessage,
  deleteToken,
  isSupported as _isSupported,
} from "firebase/messaging";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// --- Cache ---
let _supportCache = null;
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
 * Obtiene el token FCM y pide permisos si es necesario.
 * @param {{ forceRefresh?: boolean, vapidKey?: string }} [opts]
 */
export async function solicitarPermisoYToken(opts = {}) {
  try {
    // Permite desactivar FCM en dev con variable de entorno
    if (import.meta.env.VITE_ENABLE_FCM === "false") {
      console.warn("⚠️ FCM deshabilitado por configuración (VITE_ENABLE_FCM=false).");
      return null;
    }

    // 1) Soporte
    const supported = await isMessagingSupported();
    if (!supported) {
      console.warn("⚠️ Firebase Messaging no soportado en este navegador.");
      return null;
    }

    // 2) Inicializa messaging y SW
    const messaging = await initMessaging();
    if (!messaging) {
      console.error("❌ 'messaging' no está inicializado.");
      return null;
    }

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
    const messaging = await initMessaging();
    if (!messaging) return false;

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
  isMessagingSupported().then(async (supported) => {
    if (!supported) {
      console.warn("⚠️ Foreground listener no habilitado.");
      return;
    }

    const messaging = await initMessaging();
    if (!messaging) return;

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
