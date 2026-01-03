// backend/services/iaTextService.js
// ============================================================
// 🧠 Normalizadores de texto para historial y respuesta Word
// ============================================================

/**
 * Convierte el historial del usuario en un bloque de texto
 * legible para LitisBot (útil cuando se manda al prompt).
 *
 * Cada mensaje queda como:
 *   Usuario: ...
 *   LitisBot: ...
 */
export function normalizarHistorialCliente(historial = []) {
  if (!Array.isArray(historial) || historial.length === 0) {
    return "";
  }

  return historial
    .map((msg) => {
      const rol = msg.role || msg.rol || "user";
      const nombreRol = rol === "assistant" ? "LitisBot" : "Usuario";
      const contenido = (msg.content || "").toString().trim();
      if (!contenido) return "";
      return `${nombreRol}: ${contenido}`;
    })
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Limpia la respuesta para que quede lista para copiar y pegar en Word:
 * - Quita espacios y saltos de línea innecesarios
 * - Evita bloques con demasiadas líneas en blanco
 */
export function normalizarRespuestaParaWord(texto = "") {
  if (!texto || typeof texto !== "string") return "";

  let t = texto;

  // Normalizar saltos de línea
  t = t.replace(/\r\n/g, "\n");

  // Quitar espacios repetidos
  t = t.replace(/[ \t]+/g, " ");

  // Reducir más de 2 saltos seguidos a solo 2
  t = t.replace(/\n{3,}/g, "\n\n");

  // Quitar espacios al final de cada línea
  t = t.replace(/[ \t]+\n/g, "\n");

  return t.trim();
}

// Alias por compatibilidad con código antiguo
export function normalizarRespuestaWord(texto = "") {
  return normalizarRespuestaParaWord(texto);
}

export default {
  normalizarHistorialCliente,
  normalizarRespuestaParaWord,
  normalizarRespuestaWord,
};
