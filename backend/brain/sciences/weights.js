// ======================================================================
// 🧠 LITISBRAIN – MÓDULO DE PONDERACIÓN DE CIENCIAS AUXILIARES (FASE C)
// Determina el peso (1–5) de cada ciencia según:
// - tipo de proceso
// - evidencia detectada
// - semántica del conflicto
// - rol del usuario
// - país
// ======================================================================

export function rankSciences({ ciencias, texto, materia, tipoProceso, rol, pais }) {
  const lower = (texto || "").toLowerCase();

  const results = {};

  // ---------------------------
  // FACTOR A: Tipo de proceso
  // ---------------------------
  const factorProceso = (ciencia) => {
    const map = {
      grafotecnia: materia === "civil" || materia === "penal" ? 5 : 3,
      genetica: materia === "familia" ? 5 : 2,
      medicina: materia === "penal" || materia === "laboral" ? 5 : 3,
      psicologia: materia === "penal" || materia === "familia" ? 5 : 3,
      informatica: materia === "penal" || materia === "administrativo" ? 4 : 3,
      contabilidad: materia === "administrativo" || materia === "civil" ? 5 : 3,
      auditoria: materia === "administrativo" ? 5 : 2,
      ingenieria: tipoProceso?.includes("obra") ? 5 : 3,
      criminologia: materia === "penal" ? 4 : 2,
    };
    return map[ciencia] || 2;
  };

  // ---------------------------
  // FACTOR B: Evidencia explícita
  // ---------------------------
  const factorEvidencia = (ciencia) => {
    if (ciencia === "grafotecnia" && lower.match(/firma|documento|rubrica|contrato|pericia documentoscopia/)) return 5;
    if (ciencia === "genetica" && lower.match(/adn|muestra|paternidad|filiacion/)) return 5;
    if (ciencia === "medicina" && lower.match(/lesion|herida|certificado medico|necropsia/)) return 5;
    if (ciencia === "psicologia" && lower.match(/amenaza|hostigamiento|daño moral|acoso/)) return 4;
    if (ciencia === "informatica" && lower.match(/red|archivo|transferencia|hackeo|whatsapp|pdf adulterado/)) return 5;
    if (ciencia === "contabilidad" && lower.match(/transferencia|saldo|perdida|lucro cesante|ingresos/)) return 4;
    if (ciencia === "auditoria" && lower.match(/contraloria|ejecucion presupuestal|expediente tecnico/)) return 4;
    if (ciencia === "ingenieria" && lower.match(/metrados|obra|colapso|concreto/)) return 5;
    return 2;
  };

  // ---------------------------
  // FACTOR C: Semántica del conflicto
  // ---------------------------
  const factorSemantico = (ciencia) => {
    if (ciencia === "grafotecnia" && lower.includes("falsificacion")) return 5;
    if (ciencia === "psicologia" && lower.includes("violencia")) return 5;
    if (ciencia === "contabilidad" && lower.includes("estafa")) return 4;
    if (ciencia === "informatica" && lower.includes("fraude digital")) return 5;
    if (ciencia === "medicina" && lower.includes("agresion")) return 5;
    return 2;
  };

  // ---------------------------
  // FACTOR D: Rol del usuario
  // ---------------------------
  const factorRol = (rol, ciencia) => {
    if (!rol) return 1;

    if (rol === "defensa" && ciencia === "grafotecnia") return 3;
    if (rol === "denunciante" && ciencia === "medicina") return 3;
    if (rol === "empresa" && ciencia === "contabilidad") return 4;

    return 1;
  };

  // ---------------------------
  // FACTOR E: País
  // ---------------------------
  const factorPais = (pais, ciencia) => {
    if (!pais) return 1;
    if (pais === "peru" && ciencia === "auditoria") return 4;
    if (pais === "peru" && ciencia === "contabilidad") return 4;
    if (pais === "europa" && ciencia === "informatica") return 4;
    return 1;
  };

  // ---------------------------
  // FINAL: Cálculo del peso
  // ---------------------------
  ciencias.forEach((c) => {
    const peso =
      factorProceso(c) * 0.4 +
      factorEvidencia(c) * 0.3 +
      factorSemantico(c) * 0.2 +
      factorRol(rol, c) * 0.05 +
      factorPais(pais, c) * 0.05;

    results[c] = Math.min(5, Math.max(1, Math.round(peso)));
  });

  return results;
}

export default rankSciences;
