// backend/brain/analysis/goldenClosure.js
// ============================================================
// D3.7 — Regla de oro del cierre (INTERNO)
// Garantiza un cierre único, claro y útil.
// ============================================================

function chooseClosureType(gravity = {}, context = {}) {
  if (gravity?.label === "observacion_argumentativa" || gravity?.label === "debilidad_razonativa") {
    return "recommendation";
  }
  if (gravity?.label === "error_de_interpretacion" || gravity?.label === "infraccion_procedimental") {
    return "strategy";
  }
  if (gravity?.label === "vicio_relevante" || gravity?.label === "vicio_grave") {
    return "strategy";
  }
  if (gravity?.label === "nulidad") {
    return "warning";
  }
  return "strategy";
}

function buildClosure(type, context = {}) {
  switch (type) {
    case "recommendation":
      return "Recomendación técnica: consolida la motivación incorporando los hechos relevantes y el criterio aplicable, evitando selecciones parciales.";
    case "warning":
      return "Advertencia procesal: antes de accionar, verifica la concurrencia estricta de los presupuestos exigidos, pues una nulidad improcedente puede generar efectos adversos.";
    case "strategy":
    default:
      if (context?.plazoInminente === true) {
        return "Siguiente paso estratégico: prioriza una actuación oportuna que preserve el plazo y deja la discusión de fondo para una impugnación delimitada.";
      }
      return "Siguiente paso estratégico: define una vía de actuación concreta (impugnación delimitada o refuerzo probatorio) alineada con el agravio identificado.";
  }
}

// ============================================================
// API PRINCIPAL
// ============================================================
export function applyGoldenClosure({
  conclusion = "",
  gravity = {},
  context = {},
}) {
  const type = chooseClosureType(gravity, context);
  const closure = buildClosure(type, context);
  return `${conclusion} ${closure}`.trim();
}

export default applyGoldenClosure;
