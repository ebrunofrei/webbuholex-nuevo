// backend/services/pdfTextService.js
// ============================================================
// 🧠 Servicio de extracción y normalización de texto desde PDFs
// ------------------------------------------------------------
// USOS:
//
// 1) JURISPRUDENCIA / REPOSITORIO
//    - extractPlainTextFromPdf(buffer)
//    - buildPdfJurisContext({ textoPlano, meta })
//
// 2) LITISBOT CHAT (pericias, informes, etc.)
//    - extraerTextoDeAdjuntosPdf(adjuntos, options)
//      · adjuntos: [{ nombre, filename, mimeType, buffer, base64, localPath }]
//      · Devuelve: { ok, textoPdfUnido, pdfMetas, error?, code? }
//
// Todo en un solo módulo para no duplicar lógica ni romper código existente.
// ============================================================

import fs from "fs/promises";
import pdf from "pdf-parse";

/**
 * Error especializado para problemas de lectura de PDF.
 * (Se mantiene por compatibilidad, aunque extractPlainTextFromPdf
 *  ya no lanza, sino que devuelve ok:false).
 */
export class PdfTextError extends Error {
  constructor(message, code = "PDF_TEXT_ERROR") {
    super(message);
    this.name = "PdfTextError";
    this.code = code;
  }
}

/**
 * Extrae texto plano desde un Buffer de PDF.
 *
 * @param {Buffer} buffer - Contenido binario del PDF.
 * @param {Object} [options]
 * @param {number} [options.maxChars=40000] - Máximo de caracteres a devolver.
 * @returns {Promise<{ok:boolean, texto?:string, meta?:Object, error?:string, code?:string}>}
 */
export async function extractPlainTextFromPdf(buffer, options = {}) {
  const { maxChars = 40_000 } = options;

  // -------- Validaciones básicas de buffer ----------
  if (!buffer || !Buffer.isBuffer(buffer)) {
    return {
      ok: false,
      error: "Buffer de PDF inválido.",
      code: "INVALID_BUFFER",
    };
  }

  // Limitar PDFs absurdamente grandes (defensa básica)
  const MAX_BYTES = 25 * 1024 * 1024; // 25 MB
  if (buffer.length > MAX_BYTES) {
    return {
      ok: false,
      error: "El archivo PDF es demasiado grande para ser procesado.",
      code: "PDF_TOO_LARGE",
    };
  }

  // -------- Lectura con pdf-parse ----------
  let data;
  try {
    data = await pdf(buffer);
  } catch (err) {
    console.error("[pdfTextService] Error pdf-parse:", err);
    return {
      ok: false,
      error:
        "No se pudo leer el PDF (podría estar dañado, protegido o en un formato no soportado).",
      code: "PDF_PARSE_FAILED",
    };
  }

  // -------- Normalización de texto ----------
  let texto = String(data?.text || "")
    // Normalización de saltos de línea
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    // Evitar bloques gigantes de líneas vacías
    .replace(/\n{3,}/g, "\n\n")
    // Quitar espacios sobrantes antes de saltos de línea
    .replace(/[ \t]+\n/g, "\n")
    .trim();

  // Si no hay texto útil, probablemente es un PDF escaneado sin OCR
  if (!texto || texto.length < 20) {
    return {
      ok: false,
      error:
        "No se pudo extraer texto útil del PDF. Es posible que sea un PDF escaneado sin OCR o que esté en blanco.",
      code: "PDF_NO_TEXT",
    };
  }

  // Límite duro razonable para contexto IA
  let textoRecortado = texto;
  if (textoRecortado.length > maxChars) {
    textoRecortado = textoRecortado.slice(0, maxChars);
  }

  // Metadatos básicos
  const meta = {
    pages: data?.numpages ?? null,
    info: data?.info ?? {},
  };

  return { ok: true, texto: textoRecortado, meta };
}

/**
 * Construye un contexto tipo "sentencia" a partir del texto extraído.
 *
 * (Se usa en el repositorio de jurisprudencia / visor de sentencias)
 *
 * @param {Object} params
 * @param {string} params.textoPlano - Texto extraído del PDF.
 * @param {Object} [params.meta={}] - Metadatos opcionales sobre la resolución.
 * @returns {{jurisTextoBase:string, meta:Object}}
 */
export function buildPdfJurisContext({ textoPlano, meta = {} }) {
  const partes = [];

  const {
    titulo,
    numeroExpediente,
    organo,
    especialidad,
    fechaResolucion,
    etiqueta,
  } = meta;

  partes.push(
    "FUENTE: PDF subido por el usuario (resolución, sentencia u otro documento jurídico)."
  );

  if (titulo) {
    partes.push(`TÍTULO APROXIMADO: ${titulo}`);
  }

  if (numeroExpediente) {
    partes.push(`NÚMERO DE EXPEDIENTE (referencial): ${numeroExpediente}`);
  }

  if (organo) {
    partes.push(`ÓRGANO / SALA (referencial): ${organo}`);
  }

  if (especialidad) {
    partes.push(`ESPECIALIDAD (referencial): ${especialidad}`);
  }

  if (fechaResolucion) {
    partes.push(`FECHA DE RESOLUCIÓN (referencial): ${fechaResolucion}`);
  }

  if (etiqueta) {
    partes.push(`ETIQUETA / TIPO DE DOCUMENTO: ${etiqueta}`);
  }

  if (textoPlano) {
    partes.push(`TEXTO DETALLADO DEL PDF:\n${textoPlano}`);
  }

  const jurisTextoBase = partes.join("\n\n").trim();

  return {
    jurisTextoBase,
    meta,
  };
}

/* =====================================================================
 * 🧠 NUEVO: extracción de texto desde adjuntos para LitisBot Chat
 * ---------------------------------------------------------------------
 * Pensado para el flujo de pericias / informes en el chat:
 *
 *  - adjuntos = [
 *      {
 *        nombre?: string,
 *        filename?: string,
 *        mimeType?: string,
 *        buffer?: Buffer,
 *        base64?: string,
 *        localPath?: string,
 *      }
 *    ]
 *
 * Devuelve:
 *  {
 *    ok: boolean,
 *    textoPdfUnido: string,   // todos los PDFs concatenados y recortados
 *    pdfMetas: Array<{ nombre, origen, caracteres?, error?, code? }>,
 *    error?: string,
 *    code?: string
 *  }
 * ===================================================================== */

/**
 * Intenta obtener un Buffer a partir de la info del adjunto.
 * Prioridad: buffer directo → base64 → localPath.
 */
async function obtenerBufferDesdeAdjunto(adj) {
  // 1) Buffer directo (cuando el front lo manda crudo)
  if (adj.buffer && Buffer.isBuffer(adj.buffer)) {
    return adj.buffer;
  }

  // 2) Base64 (muy común al mandar por JSON)
  if (adj.base64 && typeof adj.base64 === "string") {
    try {
      return Buffer.from(adj.base64, "base64");
    } catch {
      return null;
    }
  }

  // 3) Ruta local en el servidor (cuando ya guardaste el archivo)
  if (adj.localPath && typeof adj.localPath === "string") {
    try {
      const buf = await fs.readFile(adj.localPath);
      return buf;
    } catch (err) {
      console.warn(
        "[pdfTextService] ⚠ No se pudo leer localPath de adjunto:",
        adj.localPath,
        err.message
      );
      return null;
    }
  }

  // 4) URL remota (S3, Vercel Blob, servidor de archivos, etc.)
  if (adj.url && typeof adj.url === "string") {
    try {
      const resp = await fetch(adj.url);
      if (!resp.ok) {
        console.warn(
          "[pdfTextService] ⚠ No se pudo descargar el PDF desde la URL:",
          adj.url,
          resp.status
        );
        return null;
      }
      const arrayBuf = await resp.arrayBuffer();
      return Buffer.from(arrayBuf);
    } catch (err) {
      console.warn(
        "[pdfTextService] ⚠ Error descargando PDF desde URL:",
        adj.url,
        err.message
      );
      return null;
    }
  }

  return null;
}

/**
 * Extrae texto de múltiples PDFs adjuntos y los concatena.
 *
 * @param {Array} adjuntos
 * @param {Object} options
 * @param {number} [options.maxCharsTotal=15000]   - Límite total de caracteres para TODOS los PDFs.
 * @param {number} [options.maxCharsPerPdf=40000]  - Límite por cada PDF (se pasa a extractPlainTextFromPdf).
 *
 * @returns {Promise<{ok:boolean, textoPdfUnido:string, pdfMetas:Array, error?:string, code?:string}>}
 */
export async function extraerTextoDeAdjuntosPdf(adjuntos = [], options = {}) {
  const { maxCharsTotal = 15_000, maxCharsPerPdf = 40_000 } = options;

  if (!Array.isArray(adjuntos) || !adjuntos.length) {
    return {
      ok: true,
      textoPdfUnido: "",
      pdfMetas: [],
    };
  }

  const pdfMetas = [];
  const textos = [];

  for (const adj of adjuntos) {
    const mime = (adj.mimeType || adj.mimetype || "").toLowerCase();
    const nombre = adj.nombre || adj.filename || "PDF sin nombre";

    if (!mime.includes("pdf")) {
      continue; // ignoramos no-PDFs aquí; se pueden procesar por otro lado si quieres
    }

    const buffer = await obtenerBufferDesdeAdjunto(adj);

    if (!buffer) {
      pdfMetas.push({
        origen: "desconocido",
        nombre,
        error: "No se encontró buffer, base64 ni localPath legible para este PDF.",
        code: "NO_BUFFER",
      });
      continue;
    }

    const resultado = await extractPlainTextFromPdf(buffer, {
      maxChars: maxCharsPerPdf,
    });

    if (!resultado.ok) {
      pdfMetas.push({
        origen: "pdfTextService",
        nombre,
        error: resultado.error,
        code: resultado.code,
      });
      continue;
    }

    const texto = resultado.texto || "";
    if (!texto.trim()) {
      pdfMetas.push({
        origen: "pdfTextService",
        nombre,
        error: "Texto vacío tras extracción.",
        code: "EMPTY_TEXT",
      });
      continue;
    }

    textos.push(
      `=== INICIO PDF: ${nombre} ===\n${texto}\n=== FIN PDF: ${nombre} ===`
    );

    pdfMetas.push({
      origen: adj.localPath ? "localPath" : adj.buffer ? "buffer" : adj.base64 ? "base64" : "desconocido",
      nombre,
      caracteres: texto.length,
      code: "OK",
    });
  }

  let textoPdfUnido = textos.join("\n\n\n").trim();

  if (!textoPdfUnido) {
    return {
      ok: false,
      textoPdfUnido: "",
      pdfMetas,
      error: "No se pudo extraer texto útil de ningún PDF adjunto.",
      code: "NO_PDF_TEXT",
    };
  }

  if (textoPdfUnido.length > maxCharsTotal) {
    textoPdfUnido = textoPdfUnido.slice(0, maxCharsTotal);
  }

  return {
    ok: true,
    textoPdfUnido,
    pdfMetas,
  };
}

export default {
  PdfTextError,
  extractPlainTextFromPdf,
  buildPdfJurisContext,
  extraerTextoDeAdjuntosPdf,
};
