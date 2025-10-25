// ============================================================
// 🧠 BÚHOLEX | Servicio de Análisis y Resumen Jurídico con OpenAI
// ============================================================
// - Lee PDF / texto plano / (Word limitado)
// - Genera:
//   1. Resumen claro del contenido
//   2. Análisis jurídico / procesal (motivación, debido proceso, vicios)
//   3. Riesgos y acciones sugeridas
//   4. Descargo de responsabilidad profesional
// - Respeta idioma solicitado (es-PE, qu-PE, ay-BO, en-US, pt-BR, etc.)
// - Contexto país por defecto: Perú
// ============================================================

import { db } from "../services/myFirebaseAdmin.js";
import OpenAI from "openai";
import pdfParse from "pdf-parse";
import chalk from "chalk";

// ============================================================
// 🔑 Inicialización segura de OpenAI
// ============================================================

let openai = null;

try {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn(
      chalk.redBright("⚠️ [OpenAI] No se encontró OPENAI_API_KEY en el entorno")
    );
  } else {
    openai = new OpenAI({ apiKey });
    console.log(chalk.greenBright("✅ [OpenAI] Cliente inicializado correctamente"));
  }
} catch (err) {
  console.error("❌ Error inicializando OpenAI:", err.message);
}

// ============================================================
// 🧽 Util: Sanitizar / truncar texto de entrada
// ============================================================

function limpiarTextoCrudo(str = "") {
  if (!str || typeof str !== "string") return "";
  // quitamos espacios basura repetidos y cortamos extremos
  const limpio = str.replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  // límite de tokens aproximado -> cortamos a ~32k chars máx para no quemar $
  // luego volveremos a cortar más adelante igual.
  return limpio.slice(0, 32000);
}

// ============================================================
// 🧠 Prompt dinámico para análisis
// ============================================================

function buildPromptAnalisisLegal({
  textoDocumento,
  nombreArchivo,
  idiomaSalida = "es-PE",
  pais = "Perú",
}) {
  // Este prompt ya es versión “abogado serio”, no asistente blando
  return `
Eres LitisBot, analista jurídico y documentalista profesional de BúhoLex.

Contexto base:
- Jurisdicción principal: ${pais} (salvo que el contenido del documento indique otra distinta).
- Tu salida DEBE estar en: ${idiomaSalida}.
- Tu lector puede ser abogado o ciudadano, así que debes ser claro, concreto y útil.

Tareas con el documento "${nombreArchivo}":
1. RESUMEN CLARO:
   Explica en lenguaje claro qué contiene el documento: hechos, posiciones de las partes,
   decisiones adoptadas, montos, plazos, sanciones, obligaciones, advertencias, etc.
   Sé breve pero preciso.

2. ANÁLISIS JURÍDICO / PROCESAL:
   Evalúa el documento como si fueras abogado litigante:
   - ¿Hay motivación fáctica (explica los hechos)?
   - ¿Hay motivación jurídica (normas / fundamentos legales citados)?
   - ¿La motivación parece SUFICIENTE o sólo aparente?
   - ¿Se respeta el debido proceso, derecho de defensa, notificación adecuada,
     proporcionalidad de la medida, congruencia entre lo pedido y lo resuelto?
   - ¿Existen riesgos de arbitrariedad, abuso de autoridad, sanción desproporcionada,
     incumplimiento de plazos, incompetencia del órgano que firma?

   NO prometas resultados seguros. Usa formulaciones tipo:
   "Podrías argumentar que...", "Podría discutirse que...".

3. RIESGOS Y ACCIONES SUGERIDAS:
   - Señala qué podría hacer la parte afectada (ejemplo: "presentar descargo administrativo en X días",
     "interponer recurso de apelación", "solicitar nulidad por falta de motivación", "pedir tutela urgente",
     "responder formalmente por escrito", "negociar").
   - Distingue acciones URGENTES (con plazo corto) vs acciones ESTRATÉGICAS.
   - Si corresponde, sugiere pedir asesoría profesional presencial.

4. DESCARGO PROFESIONAL:
   Al final SIEMPRE incluye:
   "Este análisis es preliminar y debe ser revisado por un profesional antes de usarse en sede oficial."

IMPORTANTE:
- Si el usuario subió un contrato privado, carta, minuta o comunicación empresarial,
  adapta el análisis a términos civiles/comerciales/laborales, no sólo judicial.
- Si el texto está incompleto o daña la legibilidad (escaneado malo, Word incompleto),
  dilo explícitamente antes del análisis.

Documento analizado (fragmento relevante):
"${textoDocumento}"
  `.trim();
}

// ============================================================
// 🧩 Función principal: getSummaryFromOpenAI(buffer, nombre, tipo, opciones)
// ============================================================

/**
 * Analiza un archivo subido (PDF / TXT / DOC(X) parcial) y devuelve un
 * objeto con resumen, análisis jurídico y acciones sugeridas.
 *
 * @param {Buffer} buffer - Contenido binario del archivo subido.
 * @param {string} nombre - Nombre original del archivo.
 * @param {string} tipo   - MIME type (application/pdf, text/plain, etc.)
 * @param {object} opciones
 * @param {string} opciones.idiomaSalida - ej "es-PE", "qu-PE", "ay-BO", "en-US", "pt-BR"
 * @param {string} opciones.pais         - ej "Perú", "Bolivia", "Chile"
 *
 * @returns {Promise<{
 *   resumen: string,
 *   analisis: string,
 *   acciones: string,
 *   descargo: string,
 *   textoPlanoProcesado: string
 * }>}
 */
export async function getSummaryFromOpenAI(
  buffer,
  nombre,
  tipo,
  opciones = {}
) {
  const {
    idiomaSalida = "es-PE",
    pais = "Perú",
  } = opciones;

  try {
    if (!openai) {
      throw new Error("Falta configurar la API Key de OpenAI.");
    }

    // ============================================================
    // 📄 1. Extraer texto según tipo de archivo
    // ============================================================
    let textoExtraido = "";

    if (tipo.includes("pdf")) {
      const data = await pdfParse(buffer);
      textoExtraido = data.text || "";
    } else if (
      tipo.includes("text") ||
      tipo.includes("plain") ||
      tipo.includes("rtf")
    ) {
      textoExtraido = buffer.toString("utf8");
    } else if (
      tipo.includes("msword") ||
      tipo.includes("officedocument")
    ) {
      // DOC / DOCX
      // Nota: aquí aún no estamos parseando Word en binario.
      // Podrías integrar mammoth más adelante para .docx.
      // Por ahora, al menos intentamos mandar algo útil al modelo.
      textoExtraido =
        "[Documento Word detectado. El contenido binario no se pudo extraer completamente en esta versión. " +
        "Adjunta en PDF para análisis completo o pega el texto clave aquí.]\n";
    } else {
      textoExtraido =
        "[Tipo de archivo no soportado para extracción automatizada directa. " +
        "Si es imagen escaneada, conviértela a PDF con OCR.]";
    }

    // limpieza y recorte duro para que no se coma tus tokens
    const textoLimpio = limpiarTextoCrudo(textoExtraido).slice(0, 8000);

    // ============================================================
    // 🧠 2. Construir prompt jurídico + procesal avanzado
    // ============================================================
    const promptIA = buildPromptAnalisisLegal({
      textoDocumento: textoLimpio,
      nombreArchivo: nombre,
      idiomaSalida,
      pais,
    });

    // ============================================================
    // 🤖 3. Llamada a OpenAI
    // ============================================================
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: promptIA,
        },
      ],
      temperature: 0.4, // serio, técnico
      max_tokens: 1100,
    });

    const fullAnswer =
      completion?.choices?.[0]?.message?.content?.trim() ||
      "No se pudo generar un análisis.";

    // ============================================================
    // 🧠 4. Intento de dividir la respuesta en bloques útiles
    //     (No es perfecto, pero le da estructura al frontend)
    // ============================================================
    // Buscamos secciones 1), 2), 3), 4) que pedimos en el prompt.
    // Si no encuentra, igual devolvemos todo en 'resumen'.
    const resumenMatch = fullAnswer.match(/1\)[\s\S]*?(?=2\)|$)/i);
    const analisisMatch = fullAnswer.match(/2\)[\s\S]*?(?=3\)|$)/i);
    const accionesMatch = fullAnswer.match(/3\)[\s\S]*?(?=4\)|$)/i);
    const descargoMatch = fullAnswer.match(/4\)[\s\S]*?$/i)
      || fullAnswer.match(/Este análisis es preliminar[\s\S]*$/i);

    const resumen = resumenMatch
      ? resumenMatch[0].replace(/^1\)\s*/i, "").trim()
      : fullAnswer;

    const analisis = analisisMatch
      ? analisisMatch[0].replace(/^2\)\s*/i, "").trim()
      : "No se pudo aislar análisis técnico en secciones separadas.";

    const acciones = accionesMatch
      ? accionesMatch[0].replace(/^3\)\s*/i, "").trim()
      : "No se identificaron recomendaciones procesales específicas. Pide orientación directa.";

    const descargo = descargoMatch
      ? descargoMatch[0]
          .replace(/^4\)\s*/i, "")
          .trim()
      : "Este análisis es preliminar y debe ser revisado por un profesional antes de usarse en sede oficial.";

    // ============================================================
    // 💾 5. Registro en Firestore (mejor para auditoría / métricas)
    //     Si Firestore no está disponible (local), no revienta.
    // ============================================================
    try {
      if (db) {
        await db.collection("resumenes_juridicos").add({
          nombreArchivo: nombre,
          tipoArchivo: tipo,
          fecha: new Date().toISOString(),
          idiomaSalida,
          pais,
          caracteresAnalizados: textoLimpio.length,
          resumen,
          analisis,
          acciones,
          descargo,
        });
      } else {
        console.warn(
          "⚠️ [Firestore] 'db' no disponible, se omite registro de resumen."
        );
      }
    } catch (fireErr) {
      console.warn(
        "⚠️ [Firestore] No se pudo registrar el resumen (entorno local / sin permisos):",
        fireErr?.message
      );
    }

    // ============================================================
    // 📤 6. Devolver al caller (backend route o controlador)
    // ============================================================
    return {
      resumen,
      analisis,
      acciones,
      descargo,
      textoPlanoProcesado: textoLimpio,
    };
  } catch (error) {
    console.error("❌ Error en getSummaryFromOpenAI:", error.message);

    return {
      resumen:
        "❌ Error al procesar el documento. Verifica que sea PDF/texto legible o que el servidor tenga la API Key.",
      analisis:
        "No se pudo generar análisis jurídico por un error interno del servidor.",
      acciones:
        "Intenta nuevamente o solicita asesoría presencial inmediata si el plazo es corto.",
      descargo:
        "Este análisis no pudo generarse automáticamente. Asegura revisión humana.",
      textoPlanoProcesado: "",
    };
  }
}
