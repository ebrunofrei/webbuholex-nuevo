// backend/services/jurisprudenciaNormalizer.js
// ============================================================
// 🦉 BúhoLex | Jurisprudencia Normalizer (ENTERPRISE · CANÓNICO)
// ------------------------------------------------------------
// OBJETIVO:
// - ÚNICA fuente de verdad para normalizar Jurisprudencia
// - Limpia, canoniza y unifica campos legacy → canon
// - NO razona, NO interpreta, NO arma prompts
// - Define textQuality y esTextoOficial de forma ESTRICTA
// - Seguro para Mongoose, seeds, scrapers y API
// ============================================================

/* ============================================================
 * 1. HELPERS BÁSICOS (PUROS, SIN EFECTOS COLATERALES)
 * ========================================================== */

function cleanString(v, maxLen = 200000) {
  if (v === null || v === undefined) return "";
  const s = String(v)
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return s.slice(0, maxLen);
}

function cleanArrayStrings(arr, limit = 50) {
  if (!Array.isArray(arr)) return [];
  const out = [];
  const seen = new Set();

  for (const it of arr) {
    const s = cleanString(it, 500);
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
    if (out.length >= limit) break;
  }
  return out;
}

function safeDate(d) {
  if (!d) return null;
  try {
    const x = new Date(d);
    return Number.isNaN(x.getTime()) ? null : x;
  } catch {
    return null;
  }
}

function cleanUrl(u) {
  const s = cleanString(u, 3000);
  if (!s) return "";
  const compact = s.replace(/\s+/g, "");
  if (/^javascript:/i.test(compact)) return "";
  return compact;
}

/* ============================================================
 * 2. TEXTO CANÓNICO (CALIDAD + OFICIALIDAD)
 * ========================================================== */

function computeTextQuality({ textoOficial, textoIA, texto } = {}) {
  const hasOficial = !!(textoOficial && textoOficial.trim());
  const hasIA = !!(textoIA && textoIA.trim());
  const hasGeneral = !!(texto && texto.trim());

  if (hasOficial) return { textQuality: "oficial", esTextoOficial: true };
  if (hasIA) return { textQuality: "extraccion_ia", esTextoOficial: false };
  if (hasGeneral) return { textQuality: "repositorio_general", esTextoOficial: false };
  return { textQuality: "sin_texto", esTextoOficial: false };
}

/* ============================================================
 * 3. MONGOOSE SAFE: OBJETO PLANO
 * ========================================================== */

function toPlainObject(doc) {
  if (!doc) return {};
  if (typeof doc.toObject === "function") {
    return doc.toObject({ virtuals: false });
  }
  if (typeof doc === "object") return { ...doc };
  return {};
}

/* ============================================================
 * 4. NORMALIZER PRINCIPAL (CANÓNICO ESTRICTO)
 * ========================================================== */

export function normalizeJurisprudencia(doc = {}) {
  const normalized = toPlainObject(doc);

  /* ----------------------------------------------------------
   * 4.1 CANONIZACIÓN DE ALIASES (LEGACY → CANON)
   * -------------------------------------------------------- */

  if (!normalized.numeroExpediente && normalized.expediente) {
    normalized.numeroExpediente = normalized.expediente;
  }

  if (!normalized.organo && normalized.organoJurisdiccional) {
    normalized.organo = normalized.organoJurisdiccional;
  }
  if (!normalized.organo && normalized.salaSuprema) {
    normalized.organo = normalized.salaSuprema;
  }

  if (!normalized.pdfUrl && normalized.pdf) normalized.pdfUrl = normalized.pdf;
  if (!normalized.pdfUrl && normalized.pdfLink) normalized.pdfUrl = normalized.pdfLink;
  if (!normalized.urlResolucion && normalized.url) normalized.urlResolucion = normalized.url;

  if (!normalized.palabrasClave && normalized.palabras_clave) {
    normalized.palabrasClave = normalized.palabras_clave;
  }

  /* ----------------------------------------------------------
   * 4.2 IDENTIFICADORES / REFERENCIAS
   * -------------------------------------------------------- */

  normalized.uuid = cleanString(normalized.uuid, 512);
  normalized.hash = cleanString(normalized.hash, 512);
  if (!normalized.hash) delete normalized.hash;

  normalized.numeroExpediente = cleanString(normalized.numeroExpediente, 256);
  normalized.numeroProceso = cleanString(normalized.numeroProceso, 256);

  normalized.recurso = cleanString(normalized.recurso, 256);
  normalized.tipoResolucion = cleanString(normalized.tipoResolucion, 256);

  /* ----------------------------------------------------------
   * 4.3 ÓRGANO / CLASIFICACIÓN
   * -------------------------------------------------------- */

  normalized.organo = cleanString(normalized.organo, 512);
  normalized.salaSuprema = cleanString(normalized.salaSuprema, 512);
  normalized.instancia = cleanString(normalized.instancia, 128);

  normalized.especialidad = cleanString(normalized.especialidad, 128);
  normalized.materia = cleanString(normalized.materia, 128);
  normalized.tema = cleanString(normalized.tema, 256);
  normalized.subtema = cleanString(normalized.subtema, 256);

  /* ----------------------------------------------------------
   * 4.4 FECHAS
   * -------------------------------------------------------- */

  normalized.fechaResolucion = safeDate(normalized.fechaResolucion);
  normalized.fechaPublicacion = safeDate(normalized.fechaPublicacion);
  normalized.fechaScraping = safeDate(normalized.fechaScraping) || new Date();

  /* ----------------------------------------------------------
   * 4.5 CONTENIDO UI / LEGAL
   * -------------------------------------------------------- */

  normalized.titulo = cleanString(normalized.titulo, 1200);
  normalized.sumilla = cleanString(normalized.sumilla, 20000);
  normalized.resumen = cleanString(normalized.resumen, 30000);
  normalized.resumenCorto = cleanString(normalized.resumenCorto, 2000);

  normalized.pretensionDelito = cleanString(normalized.pretensionDelito, 512);
  normalized.normaDerechoInterno = cleanString(normalized.normaDerechoInterno, 2000);

  normalized.palabrasClave = cleanArrayStrings(normalized.palabrasClave, 60);
  normalized.fundamentos = cleanString(normalized.fundamentos, 120000);
  normalized.parteResolutiva = cleanString(normalized.parteResolutiva, 120000);
  normalized.baseLegal = cleanString(normalized.baseLegal, 50000);

  /* ----------------------------------------------------------
   * 4.6 TEXTO COMPLETO
   * -------------------------------------------------------- */

  normalized.contenidoHTML = cleanString(normalized.contenidoHTML, 250000);
  normalized.texto = cleanString(normalized.texto, 250000);
  normalized.textoIA = cleanString(normalized.textoIA, 250000);
  normalized.textoOficial = cleanString(normalized.textoOficial, 250000);

  /* ----------------------------------------------------------
   * 4.7 URLs / FUENTES
   * -------------------------------------------------------- */

  normalized.urlResolucion = cleanUrl(normalized.urlResolucion);
  normalized.pdfUrl = cleanUrl(normalized.pdfUrl);
  normalized.pdfOficialUrl = cleanUrl(normalized.pdfOficialUrl);
  normalized.fuenteUrl = cleanUrl(normalized.fuenteUrl);

  normalized.fuente = cleanString(normalized.fuente || "Poder Judicial", 128);
  normalized.origen = cleanString(normalized.origen || "JNS", 64);

  if (!normalized.pdfOficialUrl) {
    normalized.pdfOficialUrl =
      normalized.pdfUrl || normalized.urlResolucion || "";
  }
  if (!normalized.pdfUrl) {
    normalized.pdfUrl =
      normalized.urlResolucion || normalized.pdfOficialUrl || "";
  }

  /* ----------------------------------------------------------
   * 4.8 ESTADO / FLAGS
   * -------------------------------------------------------- */

  normalized.estado = cleanString(normalized.estado || "Vigente", 64);
  normalized.tags = cleanArrayStrings(normalized.tags, 80);

  if (typeof normalized.citadaCount !== "number" || normalized.citadaCount < 0) {
    normalized.citadaCount = 0;
  }

  if (typeof normalized.contextVersion !== "number" || normalized.contextVersion <= 0) {
    normalized.contextVersion = 2;
  }

  /* ----------------------------------------------------------
   * 4.9 TEXT QUALITY (CANÓNICO ESTRICTO)
   * -------------------------------------------------------- */

  const computedText = computeTextQuality({
    textoOficial: normalized.textoOficial,
    textoIA: normalized.textoIA,
    texto: normalized.texto,
  });

  normalized.textQuality = computedText.textQuality;
  normalized.esTextoOficial = computedText.esTextoOficial;

  /* ----------------------------------------------------------
   * 4.10 PDF EFECTIVO (UI)
   * -------------------------------------------------------- */

  const pdfUrlEfectivo =
    (normalized.pdfOficialUrl && normalized.pdfOficialUrl.trim()) ||
    (normalized.pdfUrl && normalized.pdfUrl.trim()) ||
    (normalized.urlResolucion && normalized.urlResolucion.trim()) ||
    "";

  /* ----------------------------------------------------------
   * 4.11 OUTPUT FINAL
   * -------------------------------------------------------- */

  return {
    normalized,
    computed: {
      textQuality: normalized.textQuality,
      esTextoOficial: normalized.esTextoOficial,
      pdfUrlEfectivo,
    },
  };
}

export default normalizeJurisprudencia;
