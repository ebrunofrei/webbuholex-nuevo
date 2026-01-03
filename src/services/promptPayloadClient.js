// ============================================================================
// 🧠 BUILD PROMPT PAYLOAD (CLIENT → SERVER)
// ----------------------------------------------------------------------------
// Este archivo DEBE generar EXACTAMENTE la estructura que el backend espera.
// Nada de lógica de IA aquí. Solo empaquetar limpio.
// ============================================================================

export function buildPromptPayload({
  prompt = "",
  historial = [],
  adjuntosNorm = [],
  jurisprudencia = [],
  jurisprudenciaIds = [],
  jurisprudenciaTextoBase = "",
  modo = "general",
  materia = "general",
  modoLitis = "litigante",
  toolMode = "none",
  usuarioId = null,
  pro = false,
  metadata = {}
}) {
  return {
    prompt,
    mensajes: Array.isArray(historial) ? historial : [],

    // -------------------------------
    // ADJUNTOS NORMALIZADOS
    // -------------------------------
    adjuntosNorm: Array.isArray(adjuntosNorm)
      ? adjuntosNorm.map(a => ({
          name: a.name,
          size: a.size,
          type: a.type,
          kind: a.kind,
          url: a.url || null
        }))
      : [],

    // -------------------------------
    // JURISPRUDENCIA
    // -------------------------------
    jurisprudenciaIds: Array.isArray(jurisprudenciaIds)
      ? jurisprudenciaIds.map(String)
      : [],

    jurisprudenciaTextoBase: typeof jurisprudenciaTextoBase === "string"
      ? jurisprudenciaTextoBase
      : "",

    jurisprudencia: Array.isArray(jurisprudencia)
      ? jurisprudencia.map(j => ({
          titulo: j.titulo || "",
          numeroExpediente: j.numeroExpediente || "",
          sumilla: j.sumilla || "",
          texto: j.texto || "",
          fuenteUrl: j.fuenteUrl || ""
        }))
      : [],

    // -------------------------------
    // CONTEXTO DE MODO
    // -------------------------------
    modo,
    materia,
    modoLitis,
    toolMode,

    // -------------------------------
    // USUARIO
    // -------------------------------
    usuarioId: usuarioId || null,
    pro: Boolean(pro),

    // -------------------------------
    // METADATA ADICIONAL
    // -------------------------------
    metadata: {
      ...metadata,
      generatedAt: new Date().toISOString()
    }
  };
}
