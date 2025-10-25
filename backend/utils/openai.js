// ============================================================
// 🧠 BÚHOLEX | Servicio de Resumen Jurídico con OpenAI
// ============================================================
// Analiza documentos PDF o texto plano y genera un resumen técnico,
// jurídico y profesional con base en Derecho Peruano.
// Compatible con Vercel / Railway / entorno local.
// ============================================================

import { db, auth, storage } from "../services/myFirebaseAdmin.js";
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
    console.warn(chalk.redBright("⚠️ [OpenAI] No se encontró OPENAI_API_KEY en el entorno"));
  } else {
    openai = new OpenAI({ apiKey });
    console.log(chalk.greenBright("✅ [OpenAI] Cliente inicializado correctamente"));
  }
} catch (err) {
  console.error("❌ Error inicializando OpenAI:", err.message);
}

// ============================================================
// 🧩 Función: getSummaryFromOpenAI(buffer, nombre, tipo)
// ============================================================

/**
 * Genera un resumen jurídico profesional de un archivo.
 * @param {Buffer} buffer - Contenido del archivo subido.
 * @param {string} nombre - Nombre del archivo.
 * @param {string} tipo - Tipo MIME (ej: application/pdf, text/plain)
 * @returns {Promise<string>} Resumen jurídico generado.
 */
export async function getSummaryFromOpenAI(buffer, nombre, tipo) {
  try {
    if (!openai) {
      throw new Error("Falta configurar la API Key de OpenAI.");
    }

    let texto = "";

    // ============================================================
    // 📄 Extracción de texto según tipo de archivo
    // ============================================================
    if (tipo.includes("pdf")) {
      const data = await pdfParse(buffer);
      texto = data.text || "";
    } else if (tipo.includes("text") || tipo.includes("plain")) {
      texto = buffer.toString("utf8");
    } else if (tipo.includes("msword") || tipo.includes("officedocument")) {
      texto = "[📘 Documento Word detectado. Conviértelo a PDF para un mejor análisis.]";
    } else {
      texto = "[Tipo de archivo no soportado para resumen automático]";
    }

    // ============================================================
    // 🧠 Construcción del prompt jurídico
    // ============================================================
    const prompt = `
      Eres un abogado peruano especializado en derecho civil, administrativo y penal.
      Redacta un resumen jurídico profesional, preciso, coherente y técnico del siguiente documento.
      Utiliza un lenguaje claro, formal y evita redundancias.
      Documento: ${nombre}

      Texto:
      ${texto.slice(0, 8000)}
    `;

    // ============================================================
    // 🤖 Llamada a OpenAI
    // ============================================================
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Más eficiente que gpt-4o
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 900,
    });

    const resumen = completion.choices?.[0]?.message?.content?.trim();

    // ============================================================
    // 💾 (Opcional) Registrar en Firestore o Logs
    // ============================================================
    try {
      await db.collection("resumenes_juridicos").add({
        nombreArchivo: nombre,
        tipoArchivo: tipo,
        fecha: new Date().toISOString(),
        resumen,
        tokensEstimados: 900,
      });
    } catch {
      console.warn("⚠️ [Firestore] No se pudo registrar el resumen (entorno local sin conexión).");
    }

    return resumen || "⚠️ No se pudo generar un resumen válido del documento.";
  } catch (error) {
    console.error("❌ Error en getSummaryFromOpenAI:", error.message);
    return "❌ Error al procesar el documento con OpenAI. Verifica la configuración del servidor o el tipo de archivo.";
  }
}
