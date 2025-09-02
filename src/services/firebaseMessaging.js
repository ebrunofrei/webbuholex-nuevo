// /src/services/firebaseMessaging.js
import { messaging } from "@/firebase";
import { getToken, onMessage } from "@/firebase";

// 🔑 VAPID_KEY pública para Web Push (Firebase Console → Configuración → Claves Web Push)
const VAPID_KEY =
  "BK_FdBKoZZeavWPaEvAjEY5GZDI7gs-Kpt05ctgk4aUfp_mdT-aqDdnaefwu8pMAUvNDTaghKrhDnpI0Ej9PgUU";

/**
 * Solicita permiso al usuario para recibir notificaciones
 * y devuelve el token FCM.
 */
export async function solicitarPermisoYToken() {
  try {
    const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (currentToken) {
      console.log("TOKEN FCM:", currentToken);
      alert(
        "Tu token FCM para notificaciones legales:\n" + currentToken
      );
      return currentToken;
    } else {
      alert("Permite las notificaciones para recibir alertas legales.");
      return null;
    }
  } catch (err) {
    console.error("❌ Error al obtener token FCM:", err);
    alert("No se pudo obtener el token FCM: " + err.message);
    return null;
  }
}

/**
 * Escucha notificaciones cuando la app está en primer plano
 */
export function listenToForegroundMessages() {
  onMessage(messaging, (payload) => {
    console.log("📩 Notificación recibida en foreground:", payload);
    alert(
      `¡Notificación recibida!\n\n${payload.notification?.title}\n${payload.notification?.body}`
    );
  });
}
