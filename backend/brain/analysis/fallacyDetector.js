// ======================================================================
// 🧠 FALLACY DETECTOR – LITISBOT (FASE B2)
// ----------------------------------------------------------------------
// Detecta indicios de falacias argumentativas.
// - NO corrige
// - NO responde
// - NO sanciona
// Devuelve señales internas para control lógico.
// ======================================================================

function normalize(t = "") {
  return String(t).toLowerCase().replace(/\s+/g, " ").trim();
}

/* ======================================================================
   CATÁLOGO DE FALACIAS (POR BLOQUES)
====================================================================== */

const FALLACY_CATALOG = [
  // --------------------------------------------------
  // BLOQUE 1 – LÓGICA FORMAL / INFORMAL
  // --------------------------------------------------
  {
    id: "ad_hominem",
    label: "Ad Hominem",
    block: "Lógica informal",
    severity: "media",
    patterns: [
      /no es confiable porque/i,
      /esa persona siempre/i,
      /carece de moral/i,
      /no tiene autoridad moral/i,
    ],
    note:
      "Se desacredita a la persona en lugar de analizar el argumento.",
  },
  {
    id: "tu_quoque",
    label: "Tu Quoque",
    block: "Lógica informal",
    severity: "media",
    patterns: [
      /tú también hiciste/i,
      /usted tampoco cumple/i,
    ],
    note:
      "Se responde a una crítica acusando incoherencia del crítico.",
  },
  {
    id: "ad_verecundiam",
    label: "Ad Verecundiam",
    block: "Lógica informal",
    severity: "baja",
    patterns: [
      /según el experto/i,
      /como dijo el doctor/i,
      /la autoridad sostiene/i,
    ],
    note:
      "Se apela a una autoridad sin justificar la pertinencia.",
  },
  {
    id: "falsa_causalidad",
    label: "Post Hoc Ergo Propter Hoc",
    block: "Causalidad",
    severity: "alta",
    patterns: [
      /después de esto ocurrió/i,
      /por eso necesariamente/i,
      /a raíz de lo cual ocurrió/i,
    ],
    note:
      "Se asume causalidad solo por sucesión temporal.",
  },
  {
    id: "peticion_de_principio",
    label: "Petición de principio",
    block: "Lógica formal",
    severity: "alta",
    patterns: [
      /es evidente que.*porque/i,
      /esto es así ya que es así/i,
    ],
    note:
      "La conclusión está implícita en la premisa.",
  },

  // --------------------------------------------------
  // BLOQUE 2 – ARGUMENTACIÓN JURÍDICA
  // --------------------------------------------------
  {
    id: "motivacion_aparente",
    label: "Motivación aparente",
    block: "Argumentación jurídica",
    severity: "alta",
    patterns: [
      /sin mayor análisis/i,
      /basta señalar que/i,
      /queda claro que/i,
    ],
    note:
      "Aparente fundamentación sin desarrollo razonado.",
  },
  {
    id: "falsa_analogia_jurisprudencial",
    label: "Falsa analogía jurisprudencial",
    block: "Argumentación jurídica",
    severity: "alta",
    patterns: [
      /caso similar/i,
      /en un expediente parecido/i,
    ],
    note:
      "Se equiparan casos sin justificar identidad relevante.",
  },
  {
    id: "ipse_dixit",
    label: "Ipse Dixit",
    block: "Dogmatismo judicial",
    severity: "alta",
    patterns: [
      /el juez considera que/i,
      /a criterio del tribunal/i,
    ],
    note:
      "Afirmación dogmática sin sustento argumentativo.",
  },

  // --------------------------------------------------
  // BLOQUE 3 – SESGOS COGNITIVOS / DATOS
  // --------------------------------------------------
  {
    id: "generalizacion_apresurada",
    label: "Generalización apresurada",
    block: "Sesgos cognitivos",
    severity: "media",
    patterns: [
      /siempre ocurre/i,
      /en todos los casos/i,
      /nunca sucede/i,
    ],
    note:
      "Conclusión general a partir de evidencia insuficiente.",
  },
  {
    id: "cherry_picking",
    label: "Prueba incompleta (Cherry picking)",
    block: "Sesgos cognitivos",
    severity: "alta",
    patterns: [
      /solo se considera/i,
      /únicamente este dato/i,
    ],
    note:
      "Selección sesgada de evidencia favorable.",
  },

  // --------------------------------------------------
  // BLOQUE 8 – MANIPULACIÓN / DISTRACCIÓN
  // --------------------------------------------------
  {
    id: "red_herring",
    label: "Pista falsa (Red Herring)",
    block: "Distracción",
    severity: "media",
    patterns: [
      /el verdadero problema es otro/i,
      /no viene al caso/i,
    ],
    note:
      "Desviación del punto central del debate.",
  },
];

/* ======================================================================
   DETECTOR PRINCIPAL
====================================================================== */

export function detectFallacies({
  prompt = "",
  draft = "",
  cognitiveProfile = {},
}) {
  // Si el perfil NO exige control, no detectamos
  if (!cognitiveProfile?.controlDeFalacias) {
    return { detected: [] };
  }

  const text = normalize(`${prompt}\n${draft}`);
  const detected = [];

  for (const f of FALLACY_CATALOG) {
    for (const rx of f.patterns) {
      if (rx.test(text)) {
        detected.push({
          id: f.id,
          label: f.label,
          block: f.block,
          severity: f.severity,
          note: f.note,
        });
        break; // una vez basta
      }
    }
  }

  return { detected };
}
/* ======================================================================
   TRADUCTOR DE FALACIAS → CORRECCIÓN ARGUMENTATIVA (D3.2)
   - NO nombra falacias
   - NO confronta
   - Ajusta el razonamiento
====================================================================== */

export function applyFallacyCorrections({
  reasoning = "",
  detected = [],
}) {
  let r = reasoning;

  for (const f of detected) {
    switch (f.id) {
      case "ad_verecundiam":
        r +=
          " La solidez del argumento no depende de la autoridad citada, sino de la motivación y sustento verificable.";
        break;

      case "falsa_analogia_jurisprudencial":
        r +=
          " La aplicación de precedentes exige identidad normativa y similitud fáctica relevante.";
        break;

      case "cherry_picking":
        r +=
          " La valoración probatoria debe realizarse de manera conjunta y no mediante selecciones parciales.";
        break;

      case "ipse_dixit":
        r +=
          " Las afirmaciones requieren desarrollo argumentativo suficiente, más allá de su mera enunciación.";
        break;

      case "generalizacion_apresurada":
        r +=
          " No resulta jurídicamente sostenible extraer conclusiones generales sin respaldo suficiente.";
        break;

      // extensible
      default:
        break;
    }
  }

  return r;
}
