// ============================================================================
// 🧠 FALLACY DETECTOR – LITISBOT (FASE B2 — R2 ENTERPRISE)
// ----------------------------------------------------------------------------
// Detecta patrones indicativos de falacias argumentativas.
// NO corrige
// NO modula tono
// NO produce texto visible
// Única función: proveer señales internas al kernel (C1–C5).
// ============================================================================

/* ------------------------------------------------------------
   Normalizador
------------------------------------------------------------ */
function normalize(t = "") {
  return String(t)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/* ============================================================================
   CATÁLOGO DE FALACIAS (ESTABLE PARA PRODUCCIÓN)
============================================================================ */
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
    note: "Desacredita al emisor en vez del argumento.",
  },
  {
    id: "tu_quoque",
    label: "Tu Quoque",
    block: "Lógica informal",
    severity: "media",
    patterns: [/tú también hiciste/i, /usted tampoco cumple/i],
    note: "Replica señalando incoherencia del crítico.",
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
    note: "Apela a autoridad irrelevante o no demostrada.",
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
    note: "Asume causalidad por mera sucesión temporal.",
  },
  {
    id: "peticion_de_principio",
    label: "Petición de Principio",
    block: "Lógica formal",
    severity: "alta",
    patterns: [/es evidente que.*porque/i, /esto es así ya que es así/i],
    note: "La conclusión reproduce la premisa.",
  },

  // --------------------------------------------------
  // BLOQUE 2 – ARGUMENTACIÓN JURÍDICA
  // --------------------------------------------------
  {
    id: "motivacion_aparente",
    label: "Motivación aparente",
    block: "Argumentación jurídica",
    severity: "alta",
    patterns: [/sin mayor análisis/i, /basta señalar que/i, /queda claro que/i],
    note: "Fundamentación enunciativa sin desarrollo.",
  },
  {
    id: "falsa_analogia_jurisprudencial",
    label: "Falsa analogía jurisprudencial",
    block: "Argumentación jurídica",
    severity: "alta",
    patterns: [/caso similar/i, /en un expediente parecido/i],
    note: "Se equiparan casos sin identidad normativa o fáctica relevante.",
  },
  {
    id: "ipse_dixit",
    label: "Ipse Dixit",
    block: "Dogmatismo judicial",
    severity: "alta",
    patterns: [/el juez considera que/i, /a criterio del tribunal/i],
    note: "Afirmación dogmática sin motivación suficiente.",
  },

  // --------------------------------------------------
  // BLOQUE 3 – SESGOS COGNITIVOS / DATOS
  // --------------------------------------------------
  {
    id: "generalizacion_apresurada",
    label: "Generalización apresurada",
    block: "Sesgos cognitivos",
    severity: "media",
    patterns: [/siempre ocurre/i, /en todos los casos/i, /nunca sucede/i],
    note: "Conclusión general con evidencia insuficiente.",
  },
  {
    id: "cherry_picking",
    label: "Cherry Picking",
    block: "Sesgos cognitivos",
    severity: "alta",
    patterns: [/solo se considera/i, /únicamente este dato/i],
    note: "Selección parcial de evidencia.",
  },

  // --------------------------------------------------
  // BLOQUE 4 – DISTRACCIÓN
  // --------------------------------------------------
  {
    id: "red_herring",
    label: "Red Herring",
    block: "Distracción",
    severity: "media",
    patterns: [/el verdadero problema es otro/i, /no viene al caso/i],
    note: "Desvía la discusión del punto relevante.",
  },
];

/* ============================================================================
   DETECTOR PRINCIPAL (R2)
============================================================================ */
export function detectFallacies({
  prompt = "",
  draft = "",
  cognitiveProfile = {},
}) {
  // Perfil cognitivo: sin control → no detectar
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
        break; // Basta una coincidencia por falacia
      }
    }
  }

  return { detected };
}

/* ============================================================================
   CORRECCIÓN ARGUMENTATIVA (D3.2)
   - No nombra falacias
   - No confronta
   - Ajusta suavemente el razonamiento
============================================================================ */
export function applyFallacyCorrections({ reasoning = "", detected = [] }) {
  let r = reasoning;

  for (const f of detected) {
    switch (f.id) {
      case "ad_verecundiam":
        r +=
          " La solidez del argumento descansa en su sustento verificable y no en la autoridad citada.";
        break;

      case "falsa_analogia_jurisprudencial":
        r +=
          " La comparación jurisprudencial exige identidad normativa y similitud fáctica relevante.";
        break;

      case "cherry_picking":
        r +=
          " La valoración probatoria debe ser integral y no limitarse a evidencia seleccionada.";
        break;

      case "ipse_dixit":
        r +=
          " Toda afirmación requiere motivación suficiente, más allá de su enunciación.";
        break;

      case "generalizacion_apresurada":
        r +=
          " Las conclusiones amplias requieren evidencia proporcional y adecuada.";
        break;

      default:
        break;
    }
  }

  return r.trim();
}
