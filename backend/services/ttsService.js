// ============================================================
// 🔊 BúhoLex | Servicio de voz IA (Text-to-Speech varonil)
// ============================================================

import fs from "fs";
import path from "path";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Convierte texto a voz (voz masculina profesional)
 * @param {string} texto - Texto que debe ser leído
 * @param {string} salida - Ruta del archivo MP3
 * @returns {Promise<string>} Ruta del archivo generado
 */
export async function generarVozVaronil(texto, salida = "./voz.mp3") {
  try {
    const response = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy", // Varón neutro profesional
      input: texto,
      format: "mp3",
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(salida, buffer);
    return salida;
  } catch (error) {
    console.error("❌ Error al generar voz:", error.message);
    throw new Error("No se pudo generar la voz.");
  }
}
