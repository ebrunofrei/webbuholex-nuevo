// /src/services/firebaseMessaging.js
import { messaging } from "@/firebase"; // exportas getMessaging(app) como 'messaging'
import { getToken, onMessage, isSupported } from "firebase/messaging";

// 🔑 VAPID_KEY desde .env.local  (VITE_VAPID_KEY=...)
const VAPID_KEY = import.meta.env.VITE_VAPID_KEY;

/** Registra el Service Worker de FCM (debe existir en /public/firebase-messaging-sw.js) */
async function registrarServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    console.warn("⚠️ El navegador no soporta Service Workers.");
    return null;
  }

  // Solo https o localhost
  const isSecure = location.protocol === "https:" || location.hostname === "localhost";
  if (!isSecure) {
    console.warn("⚠️ FCM requiere HTTPS o localhost.");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
      scope: "/",
      type: "classic", // evita intentar ESM en algunos navegadores
    });
    await navigator.serviceWorker.ready; // espera a que esté listo
    console.log("✅ Service Worker FCM registrado:", registration);
    return registration;
  } catch (err) {
    console.error("❌ Error registrando Service Worker FCM:", err);
    return null;
  }
}

/** Pide permiso y devuelve el token FCM (o null si no hay soporte/permisos) */
export async function solicitarPermisoYToken() {
  try {
    // 1) Verifica soporte de FCM en el navegador
    const supported = await isSupported().catch(() => false);
    if (!supported) {
      console.warn("⚠️ Firebase Messaging no es soportado en este navegador.");
      return null;
    }

    if (!messaging) {
      console.error("❌ Firebase Messaging no está inicializado.");
      return null;
    }

    // 2) Registra el SW
    const registration = await registrarServiceWorker();
    if (!registration) return null;

    // 3) Pide permiso al usuario (si aún no lo concedió)
    if (typeof Notification !== "undefined") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        console.warn("⚠️ El usuario denegó permisos de notificación.");
        return null;
      }
    } else {
      console.warn("⚠️ API de Notification no disponible.");
      return null;
    }

    // 4) Obtiene token
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      console.warn("⚠️ No se obtuvo token FCM (permisos bloqueados o navegador incompatible).");
      return null;
    }

    console.log("✅ TOKEN FCM:", token);
    return token;
  } catch (err) {
    console.error("❌ Error al obtener token FCM:", err);
    return null;
  }
}

/** Escucha notificaciones cuando la app está en primer plano */
export function listenToForegroundMessages(onMessageCallback) {
  if (!messaging) {
    console.warn("⚠️ Firebase Messaging aún no está listo.");
    return;
  }

  try {
    onMessage(messaging, (payload) => {
      console.log("📩 Notificación en foreground:", payload);
      if (onMessageCallback) {
        onMessageCallback(payload);
      } else {
        const title = payload.notification?.title || "Notificación";
        const body = payload.notification?.body || "";
        alert(`📢 ${title}\n\n${body}`);
      }
    });
  } catch (err) {
    console.error("❌ Error en listenToForegroundMessages:", err);
  }
}
