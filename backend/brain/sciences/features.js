// ======================================================================
// 🧠 LITISBRAIN – FASE B
// Extracción inteligente desde texto + adjuntos
// ----------------------------------------------------------------------
// Objetivo: producir un "feature set" estable que resuma:
//  - materia principal (penal, civil, laboral...)
//  - tipo de proceso (amparo, nulidad, alimentos, etc.)
//  - rol del usuario (defensa, denunciante, empresa, estado)
//  - país (para afin tuning futuro)
//  - flags de evidencia (pericia médica, grafotecnia, informática...)
// ======================================================================

function norm(str = "") {
  return (str || "").toString().trim().toLowerCase();
}

// -----------------------------
// Mapeos básicos por palabras
// -----------------------------

const MATERIA_KEYWORDS = {
  penal: [
    "delito",
    "imputado",
    "acusado",
    "carpeta fiscal",
    "fiscalía",
    "pena",
    "prisión",
    "condena",
    "tipicidad",
    "rebeldía",
  ],
  civil: [
    "demanda de obligación",
    "indemnización",
    "daño moral",
    "responsabilidad civil",
    "nulidad de acto jurídico",
    "prescripción adquisitiva",
    "propiedad",
  ],
  laboral: [
    "despido",
    "beneficios sociales",
    "cts",
    "gratificación",
    "remuneración",
    "accidente de trabajo",
    "hostigamiento laboral",
  ],
  administrativo: [
    "procedimiento administrativo",
    "sanción administrativa",
    "resolución gerencial",
    "contraloría",
    "órgano de control",
    "acto administrativo",
  ],
  familia: [
    "alimentos",
    "tenencia",
    "régimen de visitas",
    "divorcio",
    "violencia familiar",
    "pensión",
    "patria potestad",
  ],
  constitucional: [
    "amparo",
    "habeas corpus",
    "habeas data",
    "acción popular",
    "acción de inconstitucionalidad",
  ],
};

const PROCESO_KEYWORDS = {
  amparo: ["amparo", "acción de amparo"],
  "habeas-corpus": ["habeas corpus"],
  "habeas-data": ["habeas data"],
  nulidad: ["nulidad de acto jurídico", "nulidad de contrato", "nulidad de resolución"],
  alimentos: ["alimentos", "pensión alimenticia"],
  indemnizacion: ["indemnización", "daño moral", "daños y perjuicios"],
  "prescripcion-adquisitiva": ["prescripción adquisitiva", "usucapión"],
  "obra-publica": ["obra pública", "expediente técnico", "ejecución de obra", "contrato de obra"],
};

const ROL_KEYWORDS = {
  defensa: ["defendemos a", "defensa del imputado", "patrocinamos a", "somos abogados de la parte demandada"],
  denunciante: ["denunciante", "querellante", "agraviado", "víctima", "parte demandante"],
  empresa: ["empresa", "sociedad anónima", "s.a.c.", "s.a.", "compañía"],
  estado: ["municipalidad", "gobierno regional", "ministerio", "entidad pública", "entidad estatal"],
};

const PAIS_KEYWORDS = {
  peru: ["perú", "poder judicial", "tribunal constitucional", "contraloría general de la república"],
  europa: ["tribunal europeo", "unión europea", "reglamento", "rgpd"],
};

// -----------------------------
// Heurísticas de detección
// -----------------------------

function guessFromMap(texto, mapa, defaultKey = null) {
  const t = norm(texto);
  for (const key of Object.keys(mapa)) {
    const palabras = mapa[key];
    if (palabras.some((w) => t.includes(w))) {
      return key;
    }
  }
  return defaultKey;
}

function guessMateria(texto, materiaDetectada) {
  if (materiaDetectada) return norm(materiaDetectada);

  return (
    guessFromMap(texto, MATERIA_KEYWORDS, null) ||
    "general"
  );
}

function guessTipoProceso(texto, tipoProcesoDetectado, materia) {
  if (tipoProcesoDetectado) return norm(tipoProcesoDetectado);

  const t = norm(texto);

  // Priorizar palabras fuertes
  const key = guessFromMap(t, PROCESO_KEYWORDS, null);
  if (key) return key;

  // fallback simple por materia
  if (materia === "familia" && t.includes("alimentos")) return "alimentos";

  return "general";
}

function guessRol(texto, rolDetectado) {
  if (rolDetectado) return norm(rolDetectado);

  const t = norm(texto);
  const key = guessFromMap(t, ROL_KEYWORDS, null);
  return key || "desconocido";
}

function guessPais(texto, paisDetectado) {
  if (paisDetectado) return norm(paisDetectado);

  const key = guessFromMap(texto, PAIS_KEYWORDS, null);
  return key || "peru"; // por defecto trabajamos Perú
}

// -----------------------------
// Análisis de adjuntos
// -----------------------------

function analizarAdjuntos(adjuntos = []) {
  const flags = {
    tienePericiaMedica: false,
    tienePericiaPsicologica: false,
    tienePericiaGrafotecnica: false,
    tienePericiaInformatica: false,
    tienePericiaContable: false,
    tieneAuditoria: false,
    tieneExpedienteObra: false,
  };

  adjuntos.forEach((f) => {
    const name = norm(f.nombre || f.name || "");
    const tipo = norm(f.type || "");

    if (name.includes("medico") || name.includes("certificado medico")) {
      flags.tienePericiaMedica = true;
    }
    if (name.includes("psicolog")) {
      flags.tienePericiaPsicologica = true;
    }
    if (name.includes("grafotec") || name.includes("documentoscop")) {
      flags.tienePericiaGrafotecnica = true;
    }
    if (name.includes("informe contable") || name.includes("pericia contable")) {
      flags.tienePericiaContable = true;
    }
    if (name.includes("auditoria") || name.includes("informe de control")) {
      flags.tieneAuditoria = true;
    }
    if (name.includes("pericia informática") || name.includes("forense digital")) {
      flags.tienePericiaInformatica = true;
    }
    if (name.includes("expediente tecnico") || name.includes("obra publica")) {
      flags.tieneExpedienteObra = true;
    }

    // como mínimo, si es PDF y se llama "pericia" sumamos ciencia técnica
    if (tipo.includes("pdf") && name.includes("pericia")) {
      if (!flags.tienePericiaContable && name.includes("contable")) {
        flags.tienePericiaContable = true;
      }
    }
  });

  return flags;
}

// ======================================================================
// API PRINCIPAL DE FASE B
// ======================================================================

export function extractSciencesFeatures({
  texto = "",
  adjuntos = [],
  materiaDetectada = null,
  tipoProcesoDetectado = null,
  rolDetectado = null,
  paisDetectado = null,
} = {}) {
  const materia = guessMateria(texto, materiaDetectada);
  const tipoProceso = guessTipoProceso(texto, tipoProcesoDetectado, materia);
  const rol = guessRol(texto, rolDetectado);
  const pais = guessPais(texto, paisDetectado);

  const evidenciaFlags = analizarAdjuntos(adjuntos);

  return {
    materia,
    tipoProceso,
    rol,
    pais,
    evidencia: evidenciaFlags,
  };
}

// ======================================================================
// Helper de alto nivel (opcional, para usar luego en Fase A)
// Devuelve features + texto de contexto corto para el prompt.
// ======================================================================

export function buildSciencesMetaContext(options = {}) {
  const { materia, tipoProceso, rol, pais, evidencia } =
    extractSciencesFeatures(options);

  const lineas = [];

  lineas.push(`Materia principal del caso: ${materia}.`);
  lineas.push(`Tipo de proceso: ${tipoProceso}.`);
  lineas.push(`Rol del usuario: ${rol}.`);
  lineas.push(`País/jurisdicción principal: ${pais}.`);

  const ev = [];
  if (evidencia.tienePericiaMedica) ev.push("pericia o certificado médico");
  if (evidencia.tienePericiaPsicologica) ev.push("pericia o informe psicológico");
  if (evidencia.tienePericiaGrafotecnica) ev.push("pericia grafotécnica/documentoscópica");
  if (evidencia.tienePericiaInformatica) ev.push("pericia informática o evidencia digital");
  if (evidencia.tienePericiaContable) ev.push("pericia o informe contable");
  if (evidencia.tieneAuditoria) ev.push("informe de auditoría o control gubernamental");
  if (evidencia.tieneExpedienteObra) ev.push("expediente técnico de obra pública");

  if (ev.length) {
    lineas.push(`Evidencia técnica relevante detectada: ${ev.join(", ")}.`);
  }

  return {
    materia,
    tipoProceso,
    rol,
    pais,
    evidencia,
    contexto: lineas.join(" "),
  };
}

export default extractSciencesFeatures;
