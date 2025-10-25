// ============================================================
// 🔹 Servicio puente de scraping (versión compatible BúhoLex)
// ============================================================

import { obtenerNoticiasDeFuentes } from "./noticiasScraperService.js";

/**
 * Scrapea noticias jurídicas y generales desde todas las fuentes registradas.
 * Mantiene compatibilidad con versiones anteriores que llamaban a scrapeNoticias(tipo)
 * @param {string} tipo - "juridica", "general" u "otro"
 * @returns {Promise<Array>} Lista de noticias normalizadas
 */
export async function scrapeNoticias(tipo = "general") {
  try {
    console.log(`📡 Iniciando scraping unificado para tipo: ${tipo}`);

    // 1️⃣ Obtiene todas las noticias desde los providers activos
    const todas = await obtenerNoticiasDeFuentes();

    // 2️⃣ Validar que la respuesta de noticias no esté vacía o nula
    if (!Array.isArray(todas) || todas.length === 0) {
      console.warn("⚠️ No se han obtenido noticias de los proveedores.");
      return [];
    }

    // 3️⃣ Filtrado opcional por tipo: "juridica" o "general"
    const filtradas = tipo === "juridica"
      ? todas.filter(n => n.tipo === "juridica")
      : tipo === "general"
      ? todas.filter(n => n.tipo === "general")
      : todas; // Si tipo no es "juridica" ni "general", no filtra

    console.log(`✅ ${filtradas.length} noticias procesadas (${tipo})`);
    return filtradas;

  } catch (error) {
    // 4️⃣ Manejo de errores mejorado: log detallado
    console.error("❌ Error en scrapeNoticias:", error.message);
    return [];
  }
}
