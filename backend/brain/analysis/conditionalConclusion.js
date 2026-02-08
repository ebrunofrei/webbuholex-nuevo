// ============================================================================
// 🧠 D3.4 — CONCLUSIONES CONDICIONADAS (R2 ENTERPRISE)
// ----------------------------------------------------------------------------
// Propósito:
//  - Evitar conclusiones dogmáticas.
//  - Establecer condiciones mínimas de sostenibilidad jurídica.
//  - Ajustar según gravedad y contexto procesal.
//  - Capa 100% interna, sin lenguaje visible al usuario.
//
// NO:
//  ❌ crea argumentos
//  ❌ inventa hechos
//  ❌ recomienda acciones procesales (eso es C5)
//
// Produce una cadena concisa y estable para el kernel.
// ============================================================================

function safeStr(v = "") {
  return String(v || "").trim();
}

/* ------------------------------------------------------------
   1️⃣ CONDICIÓN JURÍDICA BASE
------------------------------------------------------------ */
function buildCondition(issue, gravity, context = {}) {
  const parts = [];

  // Regla universal base
  parts.push(
    `Esto solo sería jurídicamente sostenible si se acreditan los presupuestos fácticos y normativos pertinentes`
  );

  // Si el nivel es nulidad → requisitos reforzados
  if (gravity?.label === "nulidad") {
    parts.push(
      `y además se demuestra afectación concreta al derecho de defensa, la insanabilidad del vicio y la ausencia de convalidación`
    );
  }

  // Si el contexto indica insuficiencia probatoria → se añade
  if (context?.pruebaInsuficiente === true) {
    parts.push(`con sustento probatorio suficiente`);
  }

  // Plazo procesal comprometido
  if (context?.plazoVencido === true) {
    parts.push(
      `considerando las limitaciones derivadas del estado del plazo`
    );
  }

  return parts.join(", ");
}

/* ------------------------------------------------------------
   2️⃣ ALCANCE JURÍDICO SEGÚN GRAVEDAD
------------------------------------------------------------ */
function buildScope(gravity) {
  switch (gravity?.label) {
    case "observacion_argumentativa":
      return "el alcance es meramente argumentativo";
    case "debilidad_razonativa":
      return "el impacto se limita a debilitar la motivación";
    case "error_de_interpretacion":
      return "procede un reencuadre interpretativo";
    case "infraccion_procedimental":
      return "corresponde considerar una corrección procedimental";
    case "vicio_relevante":
      return "amerita evaluar una impugnación focalizada";
    case "vicio_grave":
      return "justifica una impugnación reforzada";
    case "nulidad":
      return "habilita excepcionalmente la nulidad";
    default:
      return "el alcance debe evaluarse con cautela";
  }
}

/* ------------------------------------------------------------
   3️⃣ SIGUIENTE PASO ESTRUCTURAL (NO PROCESAL)
------------------------------------------------------------ */
function buildNextStep(gravity, context = {}) {
  switch (gravity?.label) {
    case "observacion_argumentativa":
      return "Conviene reforzar la claridad del argumento y precisar hechos relevantes.";
    case "debilidad_razonativa":
      return "Resulta adecuado consolidar la motivación con criterios y evidencia pertinente.";
    case "error_de_interpretacion":
      return "Es razonable plantear un reencuadre interpretativo fundado en principios y finalidad normativa.";
    case "infraccion_procedimental":
      return "Corresponde identificar la vía de corrección procedimental aplicable.";
    case "vicio_relevante":
      return "Conviene delimitar el agravio y valorar su impacto concreto.";
    case "vicio_grave":
      return "Resulta prudente estructurar un cuestionamiento sólido ponderando efectos y riesgos.";
    case "nulidad":
      return "Debe verificarse estrictamente la concurrencia de todos los presupuestos habilitantes.";
    default:
      return "Se recomienda profundizar el análisis antes de adoptar una conclusión definitiva.";
  }
}

/* ============================================================================
   API PRINCIPAL
============================================================================ */
export function buildConditionalConclusion({ issue, gravity, context = {} }) {
  const condition = buildCondition(issue, gravity, context);
  const scope = buildScope(gravity);
  const next = buildNextStep(gravity, context);

  return safeStr(`${condition}; ${scope}. ${next}`);
}

export default buildConditionalConclusion;
