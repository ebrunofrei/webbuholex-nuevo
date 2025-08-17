// /src/services/firebaseMessaging.js
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { app } from "./firebaseConfig";

const firebaseConfig = {
  apiKey: "AIzaSyAlxd5_JKB7Fw5b9XES4bxECXQwvZjEu64",
  authDomain: "buholex-ab588.firebaseapp.com",
  projectId: "buholex-ab588",
  storageBucket: "buholex-ab588.firebasestorage.app",
  messagingSenderId: "608453552779",
  appId: "1:608453552779:web:8ca82b34b76bf7de5b428e",
  measurementId: "G-NQQZ7P48YX"
};

const messaging = getMessaging(app);

// Pega aquí tu VAPID_KEY pública web push de Firebase Cloud Messaging → Configuración → Claves Web Push
const VAPID_KEY = "BK_FdBKoZZeavWPaEvAjEY5GZDI7gs-Kpt05ctgk4aUfp_mdT-aqDdnaefwu8pMAUvNDTaghKrhDnpI0Ej9PgUU"; // <-- Pega aquí tu clave pública

export async function solicitarPermisoYToken() {
  try {
    const currentToken = await getToken(messaging, {
      vapidKey: VAPID_KEY
    });
    if (currentToken) {
      console.log("TOKEN FCM:", currentToken);
      alert("Tu token FCM para notificaciones legales:\n" + currentToken);
      return currentToken;
    } else {
      alert("Permite las notificaciones para recibir alertas legales.");
      return null;
    }
  } catch (err) {
    alert("No se pudo obtener el token FCM: " + err.message);
    return null;
  }
}

export function listenToForegroundMessages() {
  onMessage(messaging, (payload) => {
    alert(`¡Notificación recibida!\n\n${payload.notification?.title}\n${payload.notification?.body}`);
  });
}
