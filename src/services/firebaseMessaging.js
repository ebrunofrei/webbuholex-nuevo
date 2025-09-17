// /src/services/firebaseMessaging.js
// Requiere que en tu inicialización de Firebase exportes:
//   export const messaging = getMessaging(app)
import { messaging } from "@/firebase";
import {
  getToken,
  onMessage,
  deleteToken,
  isSupported as _isSupported,
} from "firebase/messaging";

const VAPID_KEY = import.meta.env.VITE_VAPID_KEY;

/** Cache local para evitar chequeos repetidos */
let _supportCache = null;

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

/** Asegura contexto seguro (https o localhost) para FCM */
function isSecureContextForFcm() {
  return (
    typeof window !== "undefined" &&
    (location.protocol === "https:" || location.hostname === "localhost")
  );
}

/** Registra el Service Worker del FCM (idempotente) */
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
    // Si ya hay un SW controlando esta página, reutiliza su registration
    if (navigator.serviceWorker.controller) {
      const regs = await navigator.serviceWorker.getRegistrations();
      const existing = regs.find((r) =>
        r.active?.scriptURL?.includes("firebase-messaging-sw.js")
      );
      if (existing) {
        // Asegura que esté “ready”
        await navigator.serviceWorker.ready;
        return existing;
      }
    }

    // Registra si no existe; scope "/" para poder interceptar notificaciones
    const reg = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js",
      { scope: "/" } // NOTA: Chrome soporta 'type', otros no; manténlo clásico por compatibilidad
    );
    await navigator.serviceWorker.ready;
    console.log("✅ SW FCM registrado:", reg);
    return reg;
  } catch (err) {
    console.error("❌ Error registrando SW FCM:", err);
    return null;
  }
}

/** Pide permiso de notificaciones de forma segura */
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
 * Obtiene el token FCM. Si no hay soporte o permisos → null.
 * @param {{ forceRefresh?: boolean, vapidKey?: string }} [opts]
 */
export async function solicitarPermisoYToken(opts = {}) {
  try {
    // 1) Soporte real
    const supported = await isMessagingSupported();
    if (!supported) {
      console.warn("⚠️ Firebase Messaging no es soportado en este navegador.");
      return null;
    }
    if (!messaging) {
      console.error("❌ 'messaging' no está inicializado desde '@/firebase'.");
      return null;
    }

    // 2) SW + permisos
    const swReg = await registerFcmServiceWorker();
    if (!swReg) return null;

    const granted = await ensureNotificationPermission();
    if (!granted) return null;

    // 3) Token
    const token = await getToken(messaging, {
      vapidKey: opts.vapidKey || VAPID_KEY,
      serviceWorkerRegistration: swReg,
    });

    if (!token) {
      console.warn("⚠️ No se pudo obtener token FCM (permisos o navegador).");
      return null;
    }

    console.log("✅ TOKEN FCM:", token);
    return token;
  } catch (err) {
    console.error("❌ Error al obtener token FCM:", err);
    return null;
  }
}

/**
 * Elimina el token FCM del dispositivo/ navegador actual (p. ej., al cerrar sesión).
 * Devuelve true si se eliminó correctamente.
 */
export async function borrarTokenFcm() {
  try {
    const ok = await deleteToken(messaging);
    if (ok) console.log("🗑️ Token FCM eliminado.");
    return ok;
  } catch (err) {
    console.error("❌ Error al eliminar token FCM:", err);
    return false;
  }
}

/**
 * Escucha notificaciones cuando la app está en primer plano.
 * Devuelve una función `unsubscribe()` para dejar de escuchar.
 */
export function listenToForegroundMessages(onMessageCallback) {
  const supportedPromise = isMessagingSupported();

  // Permite usarlo sin await desde la UI
  supportedPromise.then((supported) => {
    if (!supported || !messaging) {
      console.warn("⚠️ Foreground listener no habilitado (sin soporte o sin messaging).");
      return;
    }
    try {
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log("📩 Notificación en foreground:", payload);
        onMessageCallback?.(payload);
      });
      // Exponer la función para que el caller pueda cancelar el listener si quiere
      listenToForegroundMessages.unsubscribe = unsubscribe;
    } catch (err) {
      console.error("❌ Error en listenToForegroundMessages:", err);
    }
  });

  // fallback de retorno: una función no-op por si el caller intenta llamar
  return () => {
    try {
      listenToForegroundMessages.unsubscribe?.();
    } catch {}
  };
}
