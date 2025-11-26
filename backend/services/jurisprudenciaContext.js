// backend/services/jurisprudenciaContext.js
// ============================================================
// 🦉 BúhoLex | Builder de contexto para LitisBot (Jurisprudencia)
// ------------------------------------------------------------
// Recibe un documento de Jurisprudencia (Mongoose) y devuelve:
// - contextText: texto plano para alimentar al modelo (IA)
// - meta: datos estructurados para UI / razonamiento
// - Usa textoIA cuando exista (texto de trabajo - no oficial)
// ============================================================

function limpiarTexto(str = "") {
  if (!str) return "";
  return String(str)
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Construye el contexto IA para LitisBot
 * - Nunca expone PDF
 * - Nunca mezcla texto oficial con texto de trabajo
 */
export function buildJurisprudenciaContext(doc) {
  if (!doc) return null;

  // ---------------- METADATOS PRINCIPALES ---------------- //

  const titulo = limpiarTexto(doc.titulo);
  const expediente = limpiarTexto(doc.expediente);
  const organo =
    limpiarTexto(doc.organoJurisdiccional || doc.organo || doc.salaSuprema);
  const especialidad = limpiarTexto(doc.especialidad);
  const materia = limpiarTexto(doc.materia);
  const tema = limpiarTexto(doc.tema);
  const subtema = limpiarTexto(doc.subtema);

  const sumilla = limpiarTexto(doc.sumilla);
  const pretension = limpiarTexto(doc.pretensionDelito || doc.pretension);

  const fecha = doc.fechaResolucion
    ? new Date(doc.fechaResolucion).toISOString().slice(0, 10)
    : "";

  // ---------------- TEXTO DE ANÁLISIS (IA) ---------------- //

  // Priorizamos textoIA porque es el texto EXTRACIDO DEL PDF / SCRAPER
  const textoIA = limpiarTexto(doc.textoIA || "");
  const tieneTextoIA = textoIA.length > 0;

  // Si no hay textoIA, usamos texto general (texto plano legacy)
  const textoFallback = limpiarTexto(doc.texto || "");
  const tieneTextoGeneral = textoFallback.length > 0;

  const textoParaContexto = textoIA || textoFallback || "";

  // ---------------- ARMADO DEL CONTEXTO ---------------- //

  const partes = [];

  if (titulo) partes.push(`TÍTULO: ${titulo}`);
  if (expediente) partes.push(`EXPEDIENTE: ${expediente}`);
  if (organo) partes.push(`ÓRGANO JURISDICCIONAL: ${organo}`);
  if (especialidad) partes.push(`ESPECIALIDAD: ${especialidad}`);
  if (materia) partes.push(`MATERIA: ${materia}`);
  if (tema) partes.push(`TEMA: ${tema}`);
  if (subtema) partes.push(`SUBTEMA: ${subtema}`);
  if (fecha) partes.push(`FECHA DE LA RESOLUCIÓN: ${fecha}`);
  if (pretension) partes.push(`PRETENSIÓN / DELITO PRINCIPAL: ${pretension}`);
  if (sumilla) partes.push(`SUMILLA: ${sumilla}`);

  // ------ CUERPO IA ------ //
  if (textoParaContexto) {
    partes.push("");
    partes.push(
      tieneTextoIA
        ? "TEXTO DE TRABAJO PARA ANÁLISIS (extraído del PDF, no oficial):"
        : "TEXTO GENERAL DE LA RESOLUCIÓN (no oficial):"
    );
    partes.push(textoParaContexto);
  } else {
    partes.push("");
    partes.push(
      "NOTA: No se cuenta con texto de la resolución en el repositorio. Solo metadatos y sumilla."
    );
  }

  // Límite de seguridad para prompt (~12k chars)
  const contextText = partes.join("\n").slice(0, 12000);

  // -------------------- META (UI / razonamiento) -------------------- //

  return {
    contextText,
    meta: {
      id: String(doc._id),
      titulo,
      expediente,
      organo,
      especialidad,
      materia,
      tema,
      subtema,
      sumilla,
      pretension,
      fechaResolucion: fecha,

      // Metadata real
      fuente: doc.fuente || "Poder Judicial",
      fuenteUrl: doc.fuenteUrl || "",
      origen: doc.origen || "",
      contextVersion: doc.contextVersion || 1,

      // PDF oficial → solo meta, NO se usa en IA
      pdfOficialUrl: doc.pdfUrlEfectivo || "",
      tieneTextoIA,
      tieneTextoGeneral,
      esTextoOficial: !!doc.esTextoOficial, // en scrapers será false
    },
  };
}
