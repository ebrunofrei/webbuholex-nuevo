// ======================================================================
// 🧾 exportUtils — Helpers de exportación
// ======================================================================

export function formatDate(ts) {
  try {
    return new Date(ts).toLocaleString("es-PE");
  } catch {
    return "—";
  }
}

export function normalizeTimeline(timeline = []) {
  return timeline.map((e, idx) => ({
    index: idx + 1,
    fecha: formatDate(e.timestamp),
    rol: e.role === "assistant" ? "LitisBot" : "Usuario",
    contenido: e.content,
    tipoEvento: e.tipoEvento.replaceAll("_", " "),
    riesgo: e.riesgo,
    flags: Array.isArray(e.flags)
      ? e.flags.map((f) => f.message)
      : [],
  }));
}
