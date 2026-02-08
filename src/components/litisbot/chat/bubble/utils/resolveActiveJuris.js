// src/components/litisbot/chat/bubble/utils/resolveActiveJuris.js

const STORAGE_KEY = "litis:lastJurisSeleccionada";

export function resolveActiveJuris(jurisFromProps) {
  if (jurisFromProps && typeof jurisFromProps === "object") {
    return jurisFromProps;
  }

  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn(
      "[Bubble] No se pudo resolver jurisprudencia desde sessionStorage",
      err
    );
    return null;
  }
}
