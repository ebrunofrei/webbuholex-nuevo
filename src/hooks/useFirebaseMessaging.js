import { useEffect, useRef } from "react";
import {
  solicitarPermisoYToken,
  listenToForegroundMessages,
} from "@/services/firebaseMessaging";

/**
 * Hook centralizado para inicializar y escuchar FCM.
 * ✔ Seguro para React 18 + StrictMode
 * ✔ No devuelve Promises en cleanup
 * ✔ No rompe el árbol React
 */
export function useFirebaseMessaging(onMessageCallback) {
  const unsubscribeRef = useRef(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    // 🚫 Solo navegador
    if (typeof window === "undefined") return;

    // 🛑 Evitar doble inicialización (StrictMode)
    if (initializedRef.current) return;
    initializedRef.current = true;

    let active = true;

    (async () => {
      try {
        const token = await solicitarPermisoYToken();
        if (!active) return;

        if (token) {
          console.log("✅ Token FCM obtenido:", token);
        }

        const unsubscribe = listenToForegroundMessages((payload) => {
          if (!active) return;

          console.log("📩 Notificación FCM (foreground):", payload);

          if (typeof onMessageCallback === "function") {
            onMessageCallback(payload);
          }
        });

        // ✅ Guardar SOLO si es función
        if (typeof unsubscribe === "function") {
          unsubscribeRef.current = unsubscribe;
        }
      } catch (err) {
        console.warn(
          "⚠️ Error inicializando Firebase Messaging:",
          err?.message || err
        );
      }
    })();

    // 🧹 Cleanup seguro
    return () => {
      active = false;

      if (typeof unsubscribeRef.current === "function") {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [onMessageCallback]);
}
