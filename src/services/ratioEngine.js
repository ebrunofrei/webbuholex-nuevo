// src/services/ratioEngine.js
// ============================================================
// 🧠 RATIO ENGINE | Lógica jurídica estructurada para LitisBot
// - Enfoque en ratio decidendi, puntos críticos y obiter dicta
// - Pensado para jurisprudencia peruana (civil, penal, const., adm.)
// ============================================================

// ============================================================
// 🧠 RATIO_ENGINE_PRIMER (Front-end)
// Motor de análisis jurídico para documentos subidos (PDF/HTML)
// - Enfoque en ratio decidendi, puntos críticos y crítica técnica
// - Pensado para jurisprudencia peruana (civil, penal, const., adm.)
// ============================================================

export const RATIO_ENGINE_PRIMER = `
Actúa siempre como un juez superior peruano con alta formación en lógica jurídica,
teoría de la argumentación y análisis de resoluciones.

Cuando el usuario proporcione una sentencia o resolución (PDF, texto o ficha del PJ),
tu tarea central es:

1) RECONSTRUIR EL RAZONAMIENTO JUDICIAL COMO SILOGISMO:
   - Premisa mayor (norma o conjunto de normas aplicadas).
   - Premisa menor (hechos probados y situación concreta).
   - Conclusión (decisión adoptada).

2) IDENTIFICAR LA RATIO DECIDENDI:
   - Explica el núcleo argumentativo sin el cual el fallo cambiaría.
   - Expresa la ratio en uno o pocos enunciados claros.
   - Distingue entre criterios generales, sub-criterios y factores contextuales.

3) DIFERENCIAR OBITER DICTA Y ELEMENTOS ACCESORIOS:
   - Citas doctrinarias, antecedentes amplios o comentarios no esenciales.
   - No los presentes como núcleo de la decisión.

4) PUNTOS CRÍTICOS DEL CASO:
   - Identifica hechos, pruebas y actos procesales decisivos.
   - Explica cómo influyen en la aplicación de la norma.

5) CRÍTICA TÉCNICA (SI EL USUARIO LO SOLICITA O NO ESPECIFICA):
   - Detecta vicios de motivación: insuficiente, aparente, incongruencias,
     falta de justificación, error en calificación jurídica o valoración probatoria.
   - Señala interpretaciones alternativas posibles.
   - No desacredites personas; critica técnicamente la argumentación.

6) ENFOQUE PROCESAL PERUANO:
   - Distingue entre sentencia de instancia, casación, resolución constitucional,
     autos, medidas cautelares, etc.
   - Mantén estilo técnico peruano: claro, ordenado, respetuoso.

7) FORMATO RECOMENDADO DE SALIDA:
   - "Puntos críticos del caso"
   - "Ratio decidendi"
   - "Obiter dicta o elementos accesorios"
   - "Aciertos de la decisión"
   - "Posibles debilidades o vicios"
   - "Alternativas argumentativas"
   - "Uso estratégico de la sentencia"

NO inventes hechos o fundamentos que no existan.
Si falta información, reconócelo expresamente.
`.trim();

// Construye un contexto específico de la jurisprudencia
function buildJurisContextBlock(rawJuris = {}) {
  const titulo =
    rawJuris.titulo ||
    rawJuris.caso ||
    rawJuris.tituloCorto ||
    "Sentencia sin título claro";

  const numeroExpediente =
    rawJuris.numeroExpediente ||
    rawJuris.expediente ||
    rawJuris.nroExpediente ||
    rawJuris.numero ||
    "";

  const sala =
    rawJuris.organo ||
    rawJuris.sala ||
    rawJuris.salaSuprema ||
    rawJuris.tribunal ||
    rawJuris.juzgado ||
    "";

  const especialidad = rawJuris.especialidad || rawJuris.materia || "";
  const fecha = rawJuris.fechaResolucion || rawJuris.fecha || "";

  const sumilla =
    rawJuris.sumilla ||
    rawJuris.resumen ||
    rawJuris.sumillaRaw ||
    rawJuris.resumenEjecutivo ||
    "";

  const partes =
    rawJuris.partes ||
    rawJuris.parteDemandante ||
    rawJuris.parteImputado ||
    rawJuris.parteDemandada ||
    "";

  const tipoResolucion = rawJuris.tipoResolucion || rawJuris.tipo || "";

  return `
[Contexto de jurisprudencia adjunta]

- Título / caso: ${titulo || "No especificado"}.
- Expediente: ${numeroExpediente || "No especificado"}.
- Órgano/sala: ${sala || "No especificado"}.
- Especialidad: ${especialidad || "No especificado"}.
- Fecha de resolución: ${fecha || "No especificado"}.
- Tipo de resolución: ${tipoResolucion || "No especificado"}.
- Partes relevantes (si constan): ${partes || "No especificadas"}.

Sumilla o resumen disponible:
${sumilla || "[No se proporcionó sumilla o resumen]."}

Utiliza estos datos como marco para ubicar la ratio decidendi y los puntos críticos del caso.
`;
}

/**
 * Aplica el RATIO ENGINE a un arreglo de mensajes de chat.
 *
 * @param {Array<{role:"system"|"user"|"assistant",content:string}>} messages
 * @param {Object|null} jurisSeleccionada
 * @returns {Array} messages enriquecidos
 */
export function applyRatioEngine(messages = [], jurisSeleccionada = null) {
  if (!jurisSeleccionada) return messages;

  const primerMessage = {
    role: "system",
    content: RATIO_ENGINE_PRIMER.trim(),
  };

  const jurisContextMessage = {
    role: "system",
    content: buildJurisContextBlock(jurisSeleccionada),
  };

  // Si ya existe algún system-message, los ponemos al inicio respetando orden
  const hasSystem = messages.some((m) => m.role === "system");
  if (!hasSystem) {
    return [primerMessage, jurisContextMessage, ...messages];
  }

  // Si ya hay un system, no lo pisamos, solo añadimos el bloque de Ratio Engine después del primero
  const idx = messages.findIndex((m) => m.role === "system");
  if (idx === -1) {
    return [primerMessage, jurisContextMessage, ...messages];
  }

  const before = messages.slice(0, idx + 1);
  const after = messages.slice(idx + 1);

  return [...before, primerMessage, jurisContextMessage, ...after];
}
