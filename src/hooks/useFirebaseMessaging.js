// src/hooks/useFirebaseMessaging.js
import { useEffect } from "react";
import {
  solicitarPermisoYToken,
  listenToForegroundMessages,
} from "@services/firebaseMessaging";

export function useFirebaseMessaging(onMessageCallback) {
  useEffect(() => {
    async function initFCM() {
      const token = await solicitarPermisoYToken();
      if (token) {
        console.log("✅ Token FCM obtenido y listo:", token);
      }
    }

    initFCM();

    // Escuchar notificaciones en foreground
    listenToForegroundMessages((payload) => {
      console.log("📩 Notificación en primer plano:", payload);
      if (onMessageCallback) onMessageCallback(payload);
    });
  }, [onMessageCallback]);
}
