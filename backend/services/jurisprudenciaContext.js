// backend/services/jurisprudenciaContext.js
// ============================================================
// 🦉 BúhoLex | Builder de Contexto Jurídico (Jurisprudencia)
// ------------------------------------------------------------
// FUNCIÓN (CANÓNICA):
// - Construye CONTEXTO DESCRIPTIVO para LitisBot (NO razona)
// - Solo arma texto plano tipo Word: METADATOS + TEXTO BASE
// - Normaliza SIEMPRE con jurisprudenciaNormalizer (fuente única de verdad)
// - Estable y seguro: límites duros + sin romper endpoint
// ============================================================

import { normalizeJurisprudencia } from "./jurisprudenciaNormalizer.js";

/* ============================================================
   CONFIG (ENTERPRISE)
============================================================ */

const MAX_CONTEXT_CHARS = 12000;
const MAX_BODY_CHARS = 11500; // deja margen para cabeceras

/* ============================================================
   HELPERS (SEGUROS + ESTABLES)
============================================================ */

function safeStr(v, maxLen = 5000) {
  if (v === null || v === undefined) return "";
  let s = String(v).replace(/\u00A0/g, " ");
  s = s.replace(/\r\n/g, "\n");
  s = s.replace(/[ \t]+$/gm, "");
  s = s.replace(/\n{4,}/g, "\n\n\n");
  s = s.trim();
  if (maxLen && s.length > maxLen) s = s.slice(0, maxLen);
  return s;
}

// Metadatos: 1 línea (compacto)
function metaLine(v) {
  return safeStr(v, 1200).replace(/\s+/g, " ").trim();
}

function formatFechaISO(fecha) {
  if (!fecha) return "";
  try {
    const d = new Date(fecha);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function pushIf(lines, label, value) {
  const v = metaLine(value);
  if (v) lines.push(`${label}: ${v}`);
}

function hardSlice(s, maxChars) {
  const t = safeStr(s, maxChars);
  return t.length > maxChars ? t.slice(0, maxChars) : t;
}

/* ============================================================
   BUILDER PRINCIPAL (CANÓNICO)
============================================================ */

export function buildJurisprudenciaContext(doc) {
  if (!doc) return null;

  // 1) Normalización canónica (si falla, no tumba el endpoint)
  let n = null;
  let computed = null;

  try {
    const r = normalizeJurisprudencia(doc);
    n = r?.normalized || doc;
    computed = r?.computed || null;
  } catch {
    n = doc;
    computed = null;
  }

  // 2) Metadatos (tomamos YA NORMALIZADO)
  const meta = {
    id: String(n._id || n.id || ""),
    titulo: metaLine(n.titulo),
    expediente: metaLine(n.numeroExpediente || n.expediente),
    tipoResolucion: metaLine(n.tipoResolucion),
    recurso: metaLine(n.recurso),
    organo: metaLine(n.organo || n.organoJurisdiccional || n.salaSuprema),
    materia: metaLine(n.materia),
    especialidad: metaLine(n.especialidad),
    tema: metaLine(n.tema),
    subtema: metaLine(n.subtema),
    fechaResolucion: formatFechaISO(n.fechaResolucion),

    sumilla: metaLine(n.sumilla),
    resumen: metaLine(n.resumen),
    pretension: metaLine(n.pretensionDelito || n.pretension),

    fuente: metaLine(n.fuente) || "Poder Judicial",
    origen: metaLine(n.origen) || "JNS",

    fuenteUrl: metaLine(n.fuenteUrl),
    urlResolucion: metaLine(n.urlResolucion),

    pdfOficialUrl: metaLine(n.pdfOficialUrl),
    pdfUrl: metaLine(n.pdfUrl),
  };

  // URL efectiva (mejor usar lo que calcula el normalizer si existe)
  const pdfUrlEfectivo =
    (computed?.pdfUrlEfectivo && metaLine(computed.pdfUrlEfectivo)) ||
    meta.pdfOficialUrl ||
    meta.pdfUrl ||
    meta.urlResolucion ||
    "";

  const fuenteUrlEfectiva = meta.fuenteUrl || meta.urlResolucion || "";

  // 3) Texto base (canónico)
  // Nota: el normalizer ya limpia saltos; aquí solo limitamos.
  const textoOficial = safeStr(n.textoOficial || "", MAX_BODY_CHARS);
  const textoIA = safeStr(n.textoIA || "", MAX_BODY_CHARS);
  const textoGeneral = safeStr(n.texto || n.textoRepo || "", MAX_BODY_CHARS);

  const tieneTextoOficial = !!textoOficial;
  const tieneTextoIA = !!textoIA;
  const tieneTextoGeneral = !!textoGeneral;

  const textoBase = textoOficial || textoIA || textoGeneral || "";

  // 4) Ensamble del contexto (texto plano tipo Word)
  const lines = [];

  lines.push("I. IDENTIFICACIÓN DE LA RESOLUCIÓN");
  pushIf(lines, "TÍTULO", meta.titulo);
  pushIf(lines, "EXPEDIENTE", meta.expediente);
  pushIf(lines, "TIPO DE RESOLUCIÓN", meta.tipoResolucion);
  pushIf(lines, "RECURSO", meta.recurso);
  pushIf(lines, "ÓRGANO JURISDICCIONAL", meta.organo);
  pushIf(lines, "MATERIA", meta.materia);
  pushIf(lines, "ESPECIALIDAD", meta.especialidad);
  pushIf(lines, "FECHA DE LA RESOLUCIÓN", meta.fechaResolucion);
  pushIf(lines, "TEMA", meta.tema);
  pushIf(lines, "SUBTEMA", meta.subtema);
  pushIf(lines, "PDF", pdfUrlEfectivo);
  pushIf(lines, "FUENTE", fuenteUrlEfectiva);

  if (meta.sumilla || meta.resumen || meta.pretension) {
    lines.push("");
    lines.push("II. CONTEXTO DESCRIPTIVO");
    pushIf(lines, "SUMILLA", meta.sumilla);
    pushIf(lines, "RESUMEN", meta.resumen);
    pushIf(lines, "PRETENSIÓN / DELITO", meta.pretension);
  }

  lines.push("");
  lines.push("III. TEXTO BASE PARA ANÁLISIS");

  if (textoBase) {
    // Etiqueta honesta, sin adivinar “OCR”
    const nota = tieneTextoOficial
      ? "NOTA: Texto OFICIAL disponible (prioritario)."
      : (tieneTextoIA
          ? "NOTA: Texto de trabajo para análisis (NO OFICIAL)."
          : "NOTA: Texto de repositorio (NO OFICIAL).");

    lines.push(nota);
    lines.push("");
    lines.push(textoBase);
  } else {
    lines.push("NOTA: No se dispone del texto. El análisis se basará en metadatos.");
  }

  lines.push("");
  lines.push("IV. LÍMITE DEL CONTEXTO");
  lines.push(
    "Este bloque describe y transcribe. La identificación de RATIO DECIDENDI, OBITER DICTA, falacias, agravios o defectos de motivación corresponde al análisis jurídico posterior."
  );

  const contextText = hardSlice(lines.join("\n"), MAX_CONTEXT_CHARS);

  // 5) Meta final (para UI/engine)
  const outMeta = {
    id: meta.id,
    titulo: meta.titulo,
    numeroExpediente: meta.expediente,
    tipoResolucion: meta.tipoResolucion,
    recurso: meta.recurso,
    organo: meta.organo,
    materia: meta.materia,
    especialidad: meta.especialidad,
    tema: meta.tema,
    subtema: meta.subtema,
    fechaResolucion: meta.fechaResolucion,

    fuente: meta.fuente,
    origen: meta.origen,
    fuenteUrl: fuenteUrlEfectiva,
    pdfUrlEfectivo,

    tieneTextoOficial,
    tieneTextoIA,
    tieneTextoGeneral,
    longitudTexto: textoBase.length,

    // Si existe lo calculado por normalizer, úsalo (canónico)
    textQuality: computed?.textQuality || (tieneTextoOficial ? "oficial" : (tieneTextoIA ? "extraccion_ia" : (tieneTextoGeneral ? "repositorio_general" : "sin_texto"))),
    esTextoOficial: typeof computed?.esTextoOficial === "boolean" ? computed.esTextoOficial : tieneTextoOficial,

    contextVersion: typeof n.contextVersion === "number" && n.contextVersion > 0 ? n.contextVersion : 2,
  };

  return { contextText, meta: outMeta };
}

export default buildJurisprudenciaContext;
