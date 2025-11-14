// src/utils/sanitizeHtml.js
// ============================================================
// 🦉 BúhoLex | Helper simple de sanitización de HTML
// - Elimina <script> y handlers onXXX básicos
// - Útil para contenido proveniente de fuentes confiables controladas
// ============================================================

export function sanitizeHtml(html = "") {
  if (!html) return "";

  let out = String(html);

  // Quitar bloques <script>...</script>
  out = out.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");

  // Quitar atributos onXXX="..."
  out = out.replace(/\son\w+="[^"]*"/gi, "");
  out = out.replace(/\son\w+='[^']*'/gi, "");

  // Evitar javascript: en href/src
  out = out.replace(/javascript:/gi, "");

  return out;
}
