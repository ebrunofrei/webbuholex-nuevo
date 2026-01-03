// backend/brain/sciences/index.js
// ============================================================
// 🧪 SCIENCES ENGINE – Detector + Prompt Builder
// ------------------------------------------------------------
// - extractSciencesFromContext(texto, adjuntos)
//   → detecta evidencias técnicas y ciencias auxiliares relevantes
// - buildSciencesPrompt({ materia, tipoProceso, rolProcesal, pais, sciencesRank, evidencias })
//   → devuelve SIEMPRE un bloque de texto limpio para el System Prompt
// ============================================================

/**
 * Normaliza texto (minúsculas, sin tildes básicas) para buscar patrones.
 */
function normalizarTexto(str = "") {
  if (!str) return "";
  return str
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // quita tildes
}

/**
 * Diccionario base de ciencias auxiliares y sus palabras clave típicas
 * en contexto jurídico peruano/latino.
 */
const SCIENCE_DICTIONARY = {
  medicina_legal: {
    etiqueta: "Medicina legal y forense",
    keywords: [
      "necropsia",
      "autopsia",
      "examen medico legal",
      "certificado medico legal",
      "lesiones",
      "traumatismo",
      "tiempo de incapacidad",
      "pericia medica",
      "peritaje medico",
      "historia clinica"
    ],
    baseScore: 4,
  },

  psicologia_forense: {
    etiqueta: "Psicología jurídica y forense",
    keywords: [
      "pericia psicologica",
      "peritaje psicologico",
      "evaluacion psicologica",
      "perfil psicologico",
      "credibilidad del testimonio",
      "daño moral",
      "daño psicologico"
    ],
    baseScore: 3,
  },

  grafotecnia: {
    etiqueta: "Grafotecnia y documentoscopia",
    keywords: [
      "pericia grafotecnica",
      "peritaje grafotecnico",
      "informe grafotecnico",
      "firma falsificada",
      "falsificacion de firmas",
      "documentoscopia",
      "pericia de firmas"
    ],
    baseScore: 4,
  },

  informatica_forense: {
    etiqueta: "Informática forense y evidencia digital",
    keywords: [
      "pericia informatica",
      "peritaje informatico",
      "evidencia digital",
      "captura de pantalla",
      "chat de whatsapp",
      "whatsapp",
      "telegram",
      "mensajeria",
      "correo electronico",
      "email",
      "metadatos",
      "logs",
      "registro de sistema",
      "registro de accesos"
    ],
    baseScore: 4,
  },

  contabilidad_privada: {
    etiqueta: "Contabilidad y finanzas (sector privado)",
    keywords: [
      "estado de resultados",
      "balance general",
      "estado financiero",
      "flujo de caja",
      "cuentas por pagar",
      "cuentas por cobrar",
      "pericia contable",
      "peritaje contable",
      "pericia financiera",
      "libros contables",
      "asiento contable",
      "conciliacion bancaria",
      "niif",
      "nic"
    ],
    baseScore: 3,
  },

  contabilidad_gubernamental_auditoria: {
    etiqueta: "Contabilidad gubernamental y auditoría pública",
    keywords: [
      "siaf",
      "siga",
      "ejecucion presupuestal",
      "presupuesto institucional",
      "devengado",
      "girado",
      "compromiso",
      "certificacion presupuestal",
      "auditoria de cumplimiento",
      "informe de control",
      "informe de auditoria",
      "organo de control",
      "ocg",
      "oci",
      "contraloria",
      "responsabilidad funcional",
      "informe de control especifico",
      "plan de trabajo de auditoria"
    ],
    baseScore: 5,
  },

  criminalistica: {
    etiqueta: "Criminalística y cadena de custodia",
    keywords: [
      "cadena de custodia",
      "pericia balistica",
      "balistica",
      "huellas dactilares",
      "huella dactilar",
      "escena del crimen",
      "levantamiento de cadaver",
      "planimetria",
      "reconstruccion de hechos"
    ],
    baseScore: 3,
  },

  estadistica_riesgo: {
    etiqueta: "Estadística y análisis de riesgo",
    keywords: [
      "muestreo",
      "margen de error",
      "intervalo de confianza",
      "probabilidad",
      "modelo econometrico",
      "riesgo crediticio",
      "analisis de riesgo"
    ],
    baseScore: 2,
  },

  sociologia_economia_criminologia: {
    etiqueta: "Sociología, economía y criminología",
    keywords: [
      "contexto socioeconomico",
      "tasa de criminalidad",
      "indicadores sociales",
      "impacto economico",
      "costos sociales",
      "politica criminal"
    ],
    baseScore: 1,
  },
};

/**
 * Analiza el texto + metadatos de adjuntos y produce:
 *  - sciencesRank: [{ id, etiqueta, score }]
 *  - evidencias: [{ tipo, descripcion }]
 */
export function extractSciencesFromContext(texto = "", adjuntos = []) {
  const t = normalizarTexto(texto || "");
  const scores = {};
  const evidencias = [];

  // 1) Evidencias básicas desde el texto
  if (t.includes("pericia") || t.includes("peritaje") || t.includes("informe de control")) {
    evidencias.push({
      tipo: "referencia-pericial",
      descripcion: "El usuario menciona pericias o informes técnicos en la descripción del caso.",
    });
  }

  // 2) Recorrido por cada ciencia y conteo de keywords
  for (const [id, def] of Object.entries(SCIENCE_DICTIONARY)) {
    let score = 0;

    def.keywords.forEach((kw) => {
      const normKw = normalizarTexto(kw);
      if (!normKw) return;
      if (t.includes(normKw)) {
        // suma base + pequeño bonus por match
        score += def.baseScore + 1;
      }
    });

    if (score > 0) {
      scores[id] = (scores[id] || 0) + score;
    }
  }

  // 3) Análisis de adjuntos (nombre, tipo, notas…)
  if (Array.isArray(adjuntos)) {
    for (const adj of adjuntos) {
      const meta = normalizarTexto(
        `${adj.nombre || ""} ${adj.filename || ""} ${adj.mimeType || ""} ${adj.descripcion || ""} ${adj.notas || ""}`
      );

      if (!meta.trim()) continue;

      // Marcar evidencia por tipo de archivo
      if (adj.mimeType && adj.mimeType.includes("pdf")) {
        evidencias.push({
          tipo: "documento-pdf",
          descripcion: `Adjunto PDF: ${adj.nombre || adj.filename || "sin nombre"}`,
        });
      }

      // Ajustamos scores por keywords en metadata
      for (const [id, def] of Object.entries(SCIENCE_DICTIONARY)) {
        let bonus = 0;
        def.keywords.forEach((kw) => {
          const normKw = normalizarTexto(kw);
          if (meta.includes(normKw)) {
            bonus += def.baseScore + 2; // un poco más fuerte si está en el nombre del adjunto
          }
        });
        if (bonus > 0) {
          scores[id] = (scores[id] || 0) + bonus;
        }
      }
    }
  }

  // 4) Convertimos scores en lista ordenada
  const sciencesRank = Object.entries(scores)
    .map(([id, score]) => ({
      id,
      etiqueta: SCIENCE_DICTIONARY[id]?.etiqueta || id,
      score,
    }))
    .sort((a, b) => b.score - a.score);

  return {
    sciencesRank,
    evidencias,
  };
}

/**
 * Construye el bloque de prompt de ciencias auxiliares para el System Prompt.
 * Siempre devuelve algún bloque (aunque no se detecte nada técnico).
 */
export function buildSciencesPrompt({
  materia,
  tipoProceso,
  rolProcesal,
  pais,
  sciencesRank = [],
  evidencias = [],
} = {}) {
  const materiaTxt = materia || "No especificada";
  const tipoProcesoTxt = tipoProceso || "No especificado";
  const rolTxt = rolProcesal || "No precisado";
  const paisTxt = pais || "Perú";

  if (!sciencesRank.length && !evidencias.length) {
    // Caso sin evidencia técnica específica
    return `
BLOQUE DE CONTEXTO CIENTÍFICO Y PROBATORIO

Materia principal del conflicto: ${materiaTxt}
Tipo de proceso o escenario procedimental: ${tipoProcesoTxt}
Rol del usuario en el conflicto: ${rolTxt}
Jurisdicción primaria: ${paisTxt}

No se ha identificado evidencia técnica o pericial específica.
Debes analizar el caso principalmente con base en:
- Hechos alegados y documentos jurídicos.
- Normas aplicables y principios.
- Reglas probatorias generales.

Si el usuario menciona luego pericias, informes técnicos o evidencias digitales concretas,
activa la FASE C de análisis científico antes de concluir o proponer estrategia.
`.trim();
  }

  const cienciasTxt = sciencesRank
    .map((s, idx) => `${idx + 1}) ${s.etiqueta} (relevancia relativa: ${s.score})`)
    .join("\n");

  const evidenciasTxt = evidencias.length
    ? evidencias.map((e, idx) => `${idx + 1}) [${e.tipo}] ${e.descripcion}`).join("\n")
    : "No se han descrito aún las características específicas de la pericia o informe técnico.";

  return `
BLOQUE DE CONTEXTO CIENTÍFICO Y PERICIAL

Materia principal del conflicto: ${materiaTxt}
Tipo de proceso o escenario procedimental: ${tipoProcesoTxt}
Rol del usuario en el conflicto: ${rolTxt}
Jurisdicción primaria: ${paisTxt}

EVIDENCIA TÉCNICA / PERICIAL DETECTADA:
${evidenciasTxt}

CIENCIAS AUXILIARES PRIORITARIAS PARA LA FASE C:
${cienciasTxt}

REGLA PARA LITISBOT:
1. Debes activar y desarrollar la FASE C de análisis científico.
2. Evalúa metodología, fuentes de datos, cadena de custodia (si aplica), márgenes de error y posibles sesgos.
3. Conecta tus conclusiones científicas con los hechos depurados (FASE A) y con las normas aplicables (FASE B).
4. No trates la pericia como un simple “documento más”; es un insumo técnico que puede reforzar o debilitar el caso.
`.trim();
}

export default {
  extractSciencesFromContext,
  buildSciencesPrompt,
};
