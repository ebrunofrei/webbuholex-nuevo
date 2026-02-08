// ============================================================================
// 🧠 D3.7 — GOLDEN CLOSURE (R2 ENTERPRISE)
// ----------------------------------------------------------------------------
// Regla estructural interna:
//   • Garantiza que siempre exista UN ÚNICO cierre coherente.
//   • No genera estilo humano.
//   • No interpreta, no sugiere acciones reales.
//
// Produce:
//   conclusion_final = conclusion + cierre_técnico
//
// Se usa después de:
//   - normalizeReasoning
//   - coherenceChecks
//   - epistemicHumility
//   - gravityScaler
//   - conditionalConclusion
// ============================================================================

function chooseClosureType(gravity = {}, context = {}) {
  const g = gravity?.label || "";

  if (g === "observacion_argumentativa" || g === "debilidad_razonativa") {
    return "recommendation";
  }
  if (
    g === "error_de_interpretacion" ||
    g === "infraccion_procedimental" ||
    g === "vicio_relevante" ||
    g === "vicio_grave"
  ) {
    return "strategy";
  }
  if (g === "nulidad") {
    return "warning";
  }

  return "strategy";
}

/* ------------------------------------------------------------
   Construcción del cierre según tipo
------------------------------------------------------------ */
function buildClosure(type, context = {}) {
  switch (type) {
    case "recommendation":
      return (
        "Recomendación técnica: consolidar la motivación integrando hechos relevantes y el criterio aplicable," +
        " evitando selecciones parciales."
      );

    case "warning":
      return (
        "Advertencia procesal: antes de accionar, verificar estrictamente la concurrencia de los presupuestos" +
        " habilitantes, pues una nulidad improcedente puede generar efectos adversos."
      );

    case "strategy":
    default:
      if (context?.plazoInminente === true) {
        return (
          "Siguiente paso estratégico: priorizar una actuación oportuna que preserve el plazo," +
          " reservando el desarrollo de fondo para una impugnación delimitada."
        );
      }
      return (
        "Siguiente paso estratégico: definir una vía de actuación interna coherente con el agravio identificado" +
        " (refuerzo probatorio o impugnación focalizada)."
      );
  }
}

/* ============================================================================
   API PRINCIPAL
============================================================================ */
export function applyGoldenClosure({ conclusion = "", gravity = {}, context = {} }) {
  const type = chooseClosureType(gravity, context);
  const closure = buildClosure(type, context);
  return `${String(conclusion).trim()} ${closure}`.trim();
}

export default applyGoldenClosure;
