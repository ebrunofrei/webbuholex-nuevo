// ======================================================================
// 🎨 responseFormatter — CANÓNICO FINAL
// ----------------------------------------------------------------------
// - NO inventa aperturas ni cierres
// - NO humaniza (eso vive en systemPrompt)
// - NO interpreta agenda
// - Limpia Markdown
// - Elimina cualquier bloque <<AGENDA_JSON>> del texto visible
// - Permite que la UI renderice el widget vía meta.agendaDraft
// ======================================================================

import { cleanMarkdown, normalizeWhites } from "./utils/markdownUtils.js";

// ----------------------------------------------------------------------
// AGENDA TAGS (fuente única)
// ----------------------------------------------------------------------
const AGENDA_OPEN = "<<AGENDA_JSON>>";
const AGENDA_CLOSE = "<</AGENDA_JSON>>";

// ----------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------
function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const AGENDA_BLOCK_RE = new RegExp(
  `${escapeRegExp(AGENDA_OPEN)}[\\s\\S]*?${escapeRegExp(AGENDA_CLOSE)}`,
  "g"
);

function stripAgendaBlocks(text = "") {
  return String(text || "").replace(AGENDA_BLOCK_RE, "").trim();
}

function containsAgendaBlock(text = "") {
  return AGENDA_BLOCK_RE.exec(String(text || "")) !== null;
}

// ----------------------------------------------------------------------
// MAIN
// ----------------------------------------------------------------------
export function formatLLMResponse({
  reply = "",
  agendaFlag = 0, // se conserva por compatibilidad, no se usa aquí
  userPrompt = "", // idem
  meta = {},
}) {
  let out = String(reply || "").trim();

  // 1) Eliminar bloques de agenda del texto visible
  if (containsAgendaBlock(out)) {
    out = stripAgendaBlocks(out);
  }

  // 2) Limpieza base
  out = normalizeWhites(out);
  out = cleanMarkdown(out);

  // 3) Si es agenda draft y no quedó texto,
  //    devolvemos vacío a propósito (la UI renderiza el widget)
  const isAgendaDraft =
    meta?.tipo === "agenda_draft" || Boolean(meta?.agendaDraft);

  if (isAgendaDraft && !out) {
    return "";
  }

  // 4) Formatter no habla. No agrega nada.
  return out;
}
