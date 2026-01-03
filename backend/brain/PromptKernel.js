// ============================================================
// 🧠 PromptKernel – Enterprise Payload Builder
// ============================================================

function sanitize(text) {
  if (!text) return "";
  return String(text).replace(/\s+/g, " ").trim();
}

function compactHistory(historial = []) {
  return historial
    .map((m) => ({
      role: m.role,
      content: sanitize(m.content),
      meta: m.meta || {},
    }))
    .filter((m) => m.content && m.role);
}

function buildContextBlock({ jurisprudencia, pdfContext }) {
  const partes = [];

  if (jurisprudencia) {
    partes.push({
      tipo: "jurisprudencia",
      id: jurisprudencia._id || jurisprudencia.id || null,
      titulo: jurisprudencia.titulo || "",
      sala: jurisprudencia.sala || jurisprudencia.organo || "",
      numero: jurisprudencia.numero || jurisprudencia.numeroExpediente || "",
      sumilla: jurisprudencia.sumilla || "",
      tema: jurisprudencia.tema || jurisprudencia.materia || "",
      litisContext: jurisprudencia.litisContext || null,
      litisMeta: jurisprudencia.litisMeta || null,
      litisSource: jurisprudencia.litisSource || null,
      litisContextId: jurisprudencia.litisContextId || null,
    });
  }

  if (pdfContext) {
    partes.push({
      tipo: "pdf",
      nombreArchivo: pdfContext.nombreArchivo,
      jurisTextoBase: pdfContext.jurisTextoBase,
      meta: pdfContext.meta || {},
      archivos: pdfContext.archivos || [],
    });
  }

  return {
    tipo: "contexto-mixto",
    partes,
    hasJuris: Boolean(jurisprudencia),
    hasPdf: Boolean(pdfContext),
  };
}

function normalizeAdjuntos(metadata) {
  const adj = metadata?.adjuntos || [];
  return adj.map((a) => ({
    name: a.name,
    size: a.size || 0,
    type: a.type || "",
    kind: a.kind || "",
    url: a.url || null,
  }));
}

export function buildPromptPayload({
  textoUsuario,
  historial,
  jurisprudencia,
  pdfContext,
  modo,
  materia,
  usuarioId,
  pro,
  metadata = {},
}) {
  const safeTexto = sanitize(textoUsuario || "Revisa los adjuntos.");

  const contexto = buildContextBlock({
    jurisprudencia,
    pdfContext,
  });

  const payload = {
    prompt: safeTexto,
    usuarioId: usuarioId || "Invitado",
    idioma: "es-PE",
    pais: "Perú",
    materia: materia || "general",
    modoLitis: metadata.modoLitis || "litigante",
    personalidad: metadata.personalidad || null,
    memoriaConfig: metadata.memoriaConfig || null,
    pro: Boolean(pro),
    modoEscritorio: modo === "general",
    ratioEngine: Boolean(contexto.hasJuris) || Boolean(contexto.hasPdf),
    adjuntos: normalizeAdjuntos(metadata),
    contexto,
    historial: compactHistory(historial),
  };

  return payload;
}

export default {
  buildPromptPayload,
};
