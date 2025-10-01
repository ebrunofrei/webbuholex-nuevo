// src/hooks/useFirebaseMessaging.js
import { useEffect } from "react";
import {
  solicitarPermisoYToken,
  listenToForegroundMessages,
} from "@/services/firebaseMessaging";

/**
 * Hook centralizado para inicializar y escuchar FCM.
 * Seguro para producción y SSR (no rompe en Vercel).
 *
 * @param {function} onMessageCallback - Callback opcional para manejar mensajes en foreground.
 */
export function useFirebaseMessaging(onMessageCallback) {
  useEffect(() => {
    // 🚫 Proteger: solo ejecutar en navegador
    if (typeof window === "undefined") return;

    let unsubscribe = null;

    async function initFCM() {
      try {
        const token = await solicitarPermisoYToken();
        if (token) {
          console.log("✅ Token FCM obtenido y listo:", token);
        }

        // Escuchar notificaciones en foreground
        unsubscribe = listenToForegroundMessages((payload) => {
          console.log("📩 Notificación en primer plano:", payload);
          if (typeof onMessageCallback === "function") {
            onMessageCallback(payload);
          }
        });
      } catch (err) {
        console.warn("⚠️ Error inicializando FCM:", err?.message || err);
      }
    }

    initFCM();

    // cleanup al desmontar
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [onMessageCallback]);
}
