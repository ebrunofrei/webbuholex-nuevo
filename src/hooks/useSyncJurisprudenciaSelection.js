// src/hooks/useSyncJurisprudenciaSelection.js
import { useState, useEffect, useCallback } from "react";

const IS_BROWSER = typeof window !== "undefined";
const STORAGE_KEY = "litis:lastJurisSeleccionada";

// 🔹 estado global en memoria (compartido entre componentes)
let globalJuris = null;
const listeners = new Set();

/**
 * Hook para compartir la jurisprudencia seleccionada entre:
 * - Jurisprudencia.jsx
 * - BubbleWithUser (App.jsx) → LitisBotBubbleChat
 */
export default function useSyncJurisprudenciaSelection() {
  const [localJuris, setLocalJuris] = useState(() => {
    if (!IS_BROWSER) return globalJuris;
    // 1ª carga desde memoria o sessionStorage
    if (globalJuris) return globalJuris;
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // suscripción a cambios globales
  useEffect(() => {
    const listener = (value) => setLocalJuris(value);
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, []);

  // setter sincronizado
  const setJurisSeleccionada = useCallback((value) => {
    globalJuris = value || null;

    // avisar a todos los que usan el hook
    listeners.forEach((fn) => fn(globalJuris));

    // persistir en sessionStorage para usarlo también desde LitisBotBubbleChat (fallback)
    if (IS_BROWSER) {
      try {
        if (value) {
          window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
        } else {
          window.sessionStorage.removeItem(STORAGE_KEY);
        }
      } catch (e) {
        console.warn("[useSyncJurisprudenciaSelection] Error guardando en sessionStorage:", e);
      }
    }
  }, []);

  return {
    jurisSeleccionada: localJuris,
    setJurisSeleccionada,
  };
}
