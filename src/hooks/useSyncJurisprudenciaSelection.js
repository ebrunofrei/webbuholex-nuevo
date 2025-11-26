// src/hooks/useSyncJurisprudenciaSelection.js
// ============================================================
// Hook para mantener sincronizada la sentencia seleccionada
// entre estado React y sessionStorage (clave única del proyecto).
// ============================================================

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "litis:lastJurisSeleccionada";
const IS_BROWSER = typeof window !== "undefined";

export default function useSyncJurisprudenciaSelection(initialValue = null) {
  const [jurisSeleccionada, setJurisSeleccionadaState] = useState(
    initialValue
  );

  // Carga inicial desde sessionStorage si no hay valor en memoria
  useEffect(() => {
    if (!IS_BROWSER) return;
    if (jurisSeleccionada) return; // ya hay algo en memoria

    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setJurisSeleccionadaState(parsed);
      }
    } catch (e) {
      console.warn(
        "[useSyncJurisprudenciaSelection] No se pudo leer sessionStorage:",
        e
      );
    }
  }, [jurisSeleccionada]);

  // Setter centralizado que también sincroniza sessionStorage
  const setJurisSeleccionada = useCallback((doc) => {
    setJurisSeleccionadaState(doc);

    if (!IS_BROWSER) return;

    try {
      if (doc) {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
      } else {
        window.sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.warn(
        "[useSyncJurisprudenciaSelection] No se pudo guardar en sessionStorage:",
        e
      );
    }
  }, []);

  return { jurisSeleccionada, setJurisSeleccionada };
}
