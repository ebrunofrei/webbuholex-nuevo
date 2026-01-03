// backend/brain/analysis/conditionalConclusion.js
// ============================================================
// D3.4 — Conclusiones condicionadas (INTERNO)
// Evita dogma y promesas; cierra con utilidad.
// ============================================================

function safeStr(v = "") {
  return String(v || "").trim();
}

function buildCondition(issue, gravity, context = {}) {
  const parts = [];

  parts.push(
    `Esto solo sería jurídicamente sostenible si se acreditan los presupuestos fácticos y normativos pertinentes`
  );

  if (gravity?.label === "nulidad") {
    parts.push(
      "y, además, se demuestra una afectación concreta al derecho de defensa, la insanabilidad del vicio y la ausencia de convalidación"
    );
  }

  if (context?.pruebaInsuficiente === true) {
    parts.push("con prueba suficiente y pertinente");
  }

  if (context?.plazoVencido === true) {
    parts.push("sin perjuicio de las limitaciones derivadas del estado del plazo");
  }

  return parts.join(", ");
}

function buildScope(gravity) {
  switch (gravity?.label) {
    case "observacion_argumentativa":
      return "el alcance sería meramente argumentativo";
    case "debilidad_razonativa":
      return "el impacto se limita a debilitar la motivación";
    case "error_de_interpretacion":
      return "procedería un reencuadre interpretativo";
    case "infraccion_procedimental":
      return "podría habilitar una corrección procedimental";
    case "vicio_relevante":
      return "amerita evaluar una impugnación específica";
    case "vicio_grave":
      return "justifica una impugnación reforzada";
    case "nulidad":
      return "habilitaría, de manera excepcional, la nulidad";
    default:
      return "el alcance debe evaluarse con cautela";
  }
}

function buildNextStep(gravity, context = {}) {
  if (gravity?.label === "observacion_argumentativa") {
    return "Conviene reforzar la argumentación y precisar los hechos relevantes.";
  }
  if (gravity?.label === "debilidad_razonativa") {
    return "Resulta útil consolidar la motivación con criterios y evidencia adicionales.";
  }
  if (gravity?.label === "error_de_interpretacion") {
    return "Es recomendable proponer una interpretación alternativa fundada en principios y finalidad.";
  }
  if (gravity?.label === "infraccion_procedimental") {
    return "Corresponde evaluar la vía de corrección procedimental oportuna.";
  }
  if (gravity?.label === "vicio_relevante") {
    return "Conviene valorar una impugnación delimitada, con foco en el agravio concreto.";
  }
  if (gravity?.label === "vicio_grave") {
    return "Resulta prudente preparar una impugnación robusta, ponderando costo–riesgo.";
  }
  if (gravity?.label === "nulidad") {
    return "Antes de accionar, es indispensable verificar la concurrencia de todos los presupuestos exigidos.";
  }
  return "Se recomienda un análisis adicional antes de adoptar una decisión.";
}

// ============================================================
// API PRINCIPAL
// ============================================================
export function buildConditionalConclusion({
  issue,
  gravity,
  context = {},
}) {
  const condition = buildCondition(issue, gravity, context);
  const scope = buildScope(gravity);
  const next = buildNextStep(gravity, context);

  return safeStr(`${condition}; ${scope}. ${next}`);
}

export default buildConditionalConclusion;
