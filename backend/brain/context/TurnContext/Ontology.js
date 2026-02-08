// ============================================================================
// 🧠 Ontology.js — R7.6++ (2026)
// Ontología jurídica jerárquica, modular y extensible para LITIS COGNITIVO.
// - NO contiene lógica.
// - NO hace matching.
// - Solo define familias semánticas limpias y precompiladas.
// - Optimizada para TurnContextResolver R7.6+
// ============================================================================

// ------------------------------------------------------------
// 1) TABLAS DE PATRONES EN CRUDO (human-readable)
// ------------------------------------------------------------
const RAW_ONTOLOGY = {
  dominio: {
    penal: [
      "penal", "delito", "acusación", "imputado", "tipicidad",
      "cohecho", "estafa", "autoría", "participación",
    ],
    civil: [
      "civil", "obligaciones", "familia", "daños", "responsabilidad",
      "contraprestación", "incumplimiento", "perjuicio",
    ],
    laboral: [
      "laboral", "despido", "hostigamiento", "cts",
      "planilla", "remuneración", "liquidación",
    ],
    administrativo: [
      "administrativo", "acto administrativo", "tupa",
      "silencio positivo", "procedimiento administrativo",
    ],
    compliance: [
      "compliance", "corrupción", "lavado", "debida diligencia",
      "canal de denuncias", "riesgos",
    ],
    legaltech: [
      "blockchain", "smart contract", "token",
      "firma digital", "algoritmo", "trazabilidad",
    ],
    bioetica: [
      "bioética", "consentimiento informado", "genoma", "eutanasia",
      "integridad científica",
    ],
  },

  objeto: {
    sentencia: [
      "sentencia", "fallo", "resolución", "laudo",
      "ejecutoria", "motivación", "ratio decidendi",
    ],
    contrato: [
      "contrato", "acuerdo", "cláusula", "convenio",
      "mou", "pacto", "condición resolutoria", "obligación",
    ],
    medida: [
      "cautelar", "embargo", "secuestro conservativo",
      "medida provisoria", "tutela urgente",
    ],
    expediente: [
      "expediente", "folios", "escrito", "actuados",
      "providencia", "cargo", "auto admisorio",
    ],
    prueba: [
      "prueba", "pericia", "dictamen", "indicio",
      "informe pericial", "cadena de custodia",
    ],
  },

  proceso: {
    impugnacion: [
      "apelación", "recurso", "nulidad", "casación",
      "impugnar", "agravio", "defecto procesal",
    ],
    plazo: [
      "plazo", "caducidad", "término", "prescripción",
      "vencimiento", "día hábil",
    ],
    actuacion: [
      "notificación", "traslado", "providencia", "auto",
      "decreto", "acto procesal",
    ],
  },

  hard_reset: [
    "nuevo caso", "reset", "empecemos de cero", "olvida lo anterior",
  ],
};


// ------------------------------------------------------------
// 2) UTILS — Compilador de patrones a RegExp
// ------------------------------------------------------------
function compilePattern(words) {
  const esc = words
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");

  return new RegExp(`\\b(${esc})\\b`, "i");
}


// ------------------------------------------------------------
// 3) COMPILACIÓN FINAL (RegExp de alto rendimiento)
// ------------------------------------------------------------
export const ONTOLOGY = {
  dominio: Object.fromEntries(
    Object.entries(RAW_ONTOLOGY.dominio).map(([k, words]) => [
      k,
      compilePattern(words),
    ])
  ),

  objeto: Object.fromEntries(
    Object.entries(RAW_ONTOLOGY.objeto).map(([k, words]) => [
      k,
      compilePattern(words),
    ])
  ),

  proceso: Object.fromEntries(
    Object.entries(RAW_ONTOLOGY.proceso).map(([k, words]) => [
      k,
      compilePattern(words),
    ])
  ),

  hard_reset: compilePattern(RAW_ONTOLOGY.hard_reset),
};


// ------------------------------------------------------------
// 4) EXPORTACIONES PARA USO FUTURO (útil para UI, análisis, IA…)
// ------------------------------------------------------------
export const RAW_TABLE = RAW_ONTOLOGY; // si una IA futura quiere expandir vocabulario
