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

    // 2️⃣ Filtrado opcional por tipo
    let filtradas = todas;
    if (tipo === "juridica") filtradas = todas.filter(n => n.tipo === "juridica");
    else if (tipo === "general") filtradas = todas.filter(n => n.tipo === "general");

    console.log(`✅ ${filtradas.length} noticias procesadas (${tipo})`);
    return filtradas;
  } catch (error) {
    console.error("❌ Error en scrapeNoticias:", error.message);
    return [];
  }
}
