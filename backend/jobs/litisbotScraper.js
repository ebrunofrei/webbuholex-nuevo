// jobs/litisbotScraper.js
// ============================================================
// 📰 LitisBot – Scraper de noticias jurídicas (ej. Corte IDH)
// - Scrap: https://www.corteidh.or.cr/noticias.cfm
// - Analiza cada noticia con GPT (gpt-4o-mini)
// - Guarda resultado en Firestore: colección "noticiasJuridicas"
// ============================================================

import axios from "axios";
import * as cheerio from "cheerio";
import OpenAI from "openai";

// 👇 Usa tu servicio centralizado de Firebase Admin
import { db } from "#services/myFirebaseAdmin.js";

// --- VALIDACIÓN BÁSICA DE ENTORNO ---
if (!process.env.OPENAI_API_KEY) {
  throw new Error("❌ Falta OPENAI_API_KEY en las variables de entorno");
}

// --- OPENAI SDK v4 ---
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================================
// 1. SCRAPING BOLETÍN CORTE IDH
// ============================================================

const CORTE_IDH_URL = "https://www.corteidh.or.cr/noticias.cfm";

/**
 * Normaliza URL relativa → absoluta
 */
function absolutizarUrl(base, href) {
  if (!href) return null;
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

/**
 * Extrae las noticias del boletín de Corte IDH
 */
export async function fetchNoticiasBoletinCorteIDH() {
  const { data } = await axios.get(CORTE_IDH_URL, {
    timeout: 15000,
    headers: {
      "User-Agent":
        "LitisBotScraper/1.0 (+https://buholex.com; contacto: soporte@buholex.com)",
    },
  });

  const $ = cheerio.load(data);
  const noticias = [];

  $(".noticias_lista li").each((i, el) => {
    const titulo = $(el).find("h3").text().trim();
    const resumen = $(el).find("p").text().trim();
    const href = $(el).find("a").attr("href");
    const url = absolutizarUrl(CORTE_IDH_URL, href);
    const fechaRaw = $(el).find(".fecha").text().trim();
    const fecha =
      fechaRaw && fechaRaw.length > 4
        ? fechaRaw
        : new Date().toISOString().substring(0, 10);

    if (!titulo) return; // saltar basura

    noticias.push({
      fuente: "Corte IDH",
      titulo,
      resumen,
      url,
      fecha,
    });
  });

  return noticias;
}

// ============================================================
// 2. ANÁLISIS CON GPT (STRUCTURED JSON)
// ============================================================

/**
 * Analiza una noticia con GPT y devuelve un objeto JSON con:
 *  - relevancia: "alta" | "media" | "baja"
 *  - premium: boolean
 *  - tagsAI: string[]
 *  - recomendacionIA: string
 *  - jurisprudenciaRelacionada: string[]
 *  - escribeResumenIA: string
 */
export async function analizarNoticiaConGPT(noticia) {
  const prompt = `
Eres un asistente legal que clasifica noticias jurídicas para la plataforma BúhoLex – LitisBot.

Analiza la siguiente noticia:

Título: ${noticia.titulo}
Resumen: ${noticia.resumen}
Fuente: ${noticia.fuente}
Fecha: ${noticia.fecha}
URL: ${noticia.url || "N/A"}

Responde EXCLUSIVAMENTE en JSON válido, sin texto adicional. Estructura esperada:

{
  "relevancia": "alta" | "media" | "baja",
  "premium": true | false,
  "tagsAI": ["Derecho Constitucional", "Internacional", "..."],
  "recomendacionIA": "Explica en 2-3 líneas por qué esta noticia es relevante para un abogado litigante.",
  "jurisprudenciaRelacionada": ["Caso X vs. Y", "Sentencia 123-2020", "..."],
  "escribeResumenIA": "Resumen sintético de máximo 2 líneas para mostrar en el portal."
}
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: prompt }],
      max_tokens: 400,
      temperature: 0.1,
    });

    const rawOutput = completion.choices[0]?.message?.content || "";
    // Intentar parsear JSON directo; si viniera contorneado, recortar por llaves
    let jsonStr = rawOutput.trim();

    if (!jsonStr.startsWith("{")) {
      const match = rawOutput.match(/\{[\s\S]*\}/);
      if (match) jsonStr = match[0];
    }

    const parsed = JSON.parse(jsonStr);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (e) {
    console.error("❌ Error analizando noticia con GPT:", e.message);
    return {};
  }
}

// ============================================================
// 3. GUARDAR EN FIRESTORE
// ============================================================

/**
 * Genera un ID estable a partir de fuente + título.
 */
function buildDocIdFromNoticia(noticia) {
  const base = `${noticia.fuente || "FuenteDesconocida"}-${noticia.titulo}`.trim();
  return Buffer.from(base).toString("base64").slice(0, 150); // limitar longitud
}

/**
 * Guarda noticia + análisis IA en Firestore
 */
export async function guardarNoticiaFirestore(noticia, analisisIA = {}) {
  const docId = buildDocIdFromNoticia(noticia);

  const payload = {
    ...noticia,
    ...analisisIA,
    creadoPor: "LitisBotScraper",
    fechaRegistro: new Date().toISOString(),
    actualizadoEn: new Date().toISOString(),
  };

  await db
    .collection("noticiasJuridicas")
    .doc(docId)
    .set(payload, { merge: true });

  return docId;
}

// ============================================================
// 4. ORQUESTADOR PRINCIPAL
// ============================================================

/**
 * Rutina principal:
 *  1) Scrap noticias Corte IDH
 *  2) Analiza con GPT
 *  3) Guarda en Firestore
 */
export async function rutinaLitisBotNoticias() {
  console.log("▶️ Iniciando rutinaLitisBotNoticias (Corte IDH)...");

  try {
    const noticias = await fetchNoticiasBoletinCorteIDH();
    console.log(`📥 Noticias encontradas: ${noticias.length}`);

    for (const noticia of noticias) {
      try {
        const analisisIA = await analizarNoticiaConGPT(noticia);
        const docId = await guardarNoticiaFirestore(noticia, analisisIA);
        console.log(`✔️ Guardada noticia [${docId}]: ${noticia.titulo}`);
      } catch (err) {
        console.error(
          `⚠️ Error procesando noticia "${noticia.titulo}":`,
          err.message
        );
      }
    }

    console.log("✅ rutinaLitisBotNoticias finalizada.");
  } catch (e) {
    console.error("❌ Error global en rutinaLitisBotNoticias:", e.message);
  }
}

// Ejecutar si se llama directamente desde la CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  rutinaLitisBotNoticias().catch(console.error);
}
