// /src/services/firebaseMessaging.js
import { messaging } from "@/firebase";
import { getToken, onMessage } from "firebase/messaging";

// 🔑 VAPID_KEY desde .env.local (Firebase Console → Configuración → Claves Web Push)
const VAPID_KEY = import.meta.env.VITE_VAPID_KEY;

/**
 * Registra el Service Worker de FCM (debe estar en /public/firebase-messaging-sw.js)
 */
async function registrarServiceWorker() {
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js",
        { scope: "/" }
      );
      console.log("✅ Service Worker registrado:", registration);
      return registration;
    } catch (err) {
      console.error("❌ Error registrando Service Worker:", err);
    }
  } else {
    console.warn("⚠️ El navegador no soporta Service Workers.");
  }
  return null;
}

/**
 * Solicita permiso al usuario para recibir notificaciones
 * y devuelve el token FCM.
 */
export async function solicitarPermisoYToken() {
  try {
    const registration = await registrarServiceWorker();

    if (!messaging) {
      console.error("❌ Firebase Messaging no está inicializado.");
      return null;
    }

    // Solicita permiso explícito al usuario
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("⚠️ El usuario denegó los permisos de notificación.");
      return null;
    }

    const currentToken = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (currentToken) {
      console.log("✅ TOKEN FCM obtenido:", currentToken);
      return currentToken;
    } else {
      console.warn("⚠️ No se obtuvo token, probablemente el usuario bloqueó permisos.");
      return null;
    }
  } catch (err) {
    console.error("❌ Error al obtener token FCM:", err);
    return null;
  }
}

/**
 * Escucha notificaciones cuando la app está en primer plano
 */
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
        // Fallback básico con alert
        alert(
          `📢 ${payload.notification?.title || "Notificación"}\n\n${payload.notification?.body || ""}`
        );
      }
    });
  } catch (err) {
    console.error("❌ Error en listenToForegroundMessages:", err);
  }
}
