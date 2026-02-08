// src/components/litisbot/chat/bubble/utils/resolveDocJuris.js

const STORAGE_KEY = "litis:lastJurisSeleccionada";

export function resolveDocJuris(jurisSeleccionada) {
  if (jurisSeleccionada && typeof jurisSeleccionada === "object") {
    return jurisSeleccionada;
  }

  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch {
    // silencio intencional
  }

  return null;
}
