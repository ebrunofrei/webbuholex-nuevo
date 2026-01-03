// backend/jobs/jnsSeeds.js
// ============================================================
// 🦉 BúhoLex | Seeds de búsqueda para JNS (carga masiva controlada)
// ------------------------------------------------------------
// - Cada seed dispara una búsqueda en JNS con el scraper existente
// - Objetivo: poblar el repositorio interno con temas "core"
// - Puedes agregar, comentar o ajustar queries según tu estrategia
// ============================================================

export const jnsSeeds = [
  // ---------------------- Penal ---------------------- //
  {
    id: "PENAL_PECULADO_DOLOSO",
    materia: "Penal",
    query: "peculado doloso",
  },
  {
    id: "PENAL_COLUSION",
    materia: "Penal",
    query: "colusión agravada",
  },
  {
    id: "PENAL_COHECHO",
    materia: "Penal",
    query: "cohecho pasivo propio",
  },
  {
    id: "PENAL_LAVADO_ACTIVOS",
    materia: "Penal",
    query: "lavado de activos",
  },
  {
    id: "PENAL_ORGANIZACION_CRIMINAL",
    materia: "Penal",
    query: "organización criminal",
  },

  // ---------------------- Civil ---------------------- //
  {
    id: "CIVIL_DESALOJO",
    materia: "Civil",
    query: "desalojo por ocupación precaria",
  },
  {
    id: "CIVIL_PRESCRIPCION_ADQUISITIVA",
    materia: "Civil",
    query: "prescripción adquisitiva de dominio",
  },
  {
    id: "CIVIL_NULIDAD_ACTO_JURIDICO",
    materia: "Civil",
    query: "nulidad de acto jurídico",
  },
  {
    id: "CIVIL_RESOLUCION_CONTRATO",
    materia: "Civil",
    query: "resolución de contrato",
  },

  // ---------------------- Familia ---------------------- //
  {
    id: "FAMILIA_ALIMENTOS",
    materia: "Familia",
    query: "alimentos",
  },
  {
    id: "FAMILIA_TENENCIA",
    materia: "Familia",
    query: "tenencia de menor",
  },
  {
    id: "FAMILIA_VIOLENCIA",
    materia: "Familia",
    query: "violencia familiar",
  },

  // ---------------------- Laboral ---------------------- //
  {
    id: "LABORAL_DESPIDO_ARBITRARIO",
    materia: "Laboral",
    query: "despido arbitrario",
  },
  {
    id: "LABORAL_REPOSICION",
    materia: "Laboral",
    query: "reposición laboral",
  },

  // ---------------------- Contencioso/Admin ---------------------- //
  {
    id: "ADMIN_SANCIONES",
    materia: "Contencioso Administrativo",
    query: "proceso contencioso administrativo sancionador",
  },
  {
    id: "ADMIN_NULIDAD_RESOLUCION",
    materia: "Contencioso Administrativo",
    query: "nulidad de resolución administrativa",
  },

  // ---------------------- Constitucional ---------------------- //
  {
    id: "CONST_AMPARO_TRABAJO",
    materia: "Constitucional",
    query: "proceso de amparo derechos laborales",
  },
  {
    id: "CONST_HABEAS_CORPUS",
    materia: "Constitucional",
    query: "hábeas corpus",
  },
];

// Puedes ir ampliando esta lista con más temas específicos.
// La idea es correr este runner cada cierto tiempo (mensual, trimestral) con seeds ajustados.
export default jnsSeeds;
