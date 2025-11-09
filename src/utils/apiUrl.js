// src/utils/apiUrl.js
// ============================================================
// 🦉 BúhoLex | URL helpers
// - Usa fuente única de API: API_BASE + joinApi()
// - No duplica "/api", respeta URLs absolutas y especiales
// ============================================================

import { API_BASE, joinApi } from "@/services/apiBase";

/**
 * Convierte un path relativo o URL absoluta en absoluta, segura para el backend.
 * Reglas:
 *  - http(s) → se respeta tal cual
 *  - protocol-relative (//host) → se respeta tal cual
 *  - data:, blob:, mailto:, tel: → se respetan
 *  - paths relativos o que empiezan con / o /api → se componen con joinApi()
 */
export function asAbsoluteUrl(pathOrUrl) {
  if (!pathOrUrl) return "";

  const s = String(pathOrUrl).trim();

  // URLs absolutas o especiales: devolver sin tocar
  if (
    /^https?:\/\//i.test(s) || // http/https
    /^\/\//.test(s) ||         // protocol-relative
    /^(data:|blob:|mailto:|tel:)/i.test(s)
  ) {
    return s;
  }

  // Cualquier otra cosa la tratamos como path hacia el backend
  // joinApi evita duplicar "/api" y normaliza barras
  return joinApi(s);
}

// Exporta también por conveniencia si algún consumidor necesita la base
export { API_BASE };
