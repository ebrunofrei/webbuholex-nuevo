// jobs/litisbotScraper.js
import axios from "axios";
import * as cheerio from "cheerio";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import OpenAI from "openai";

// --- INICIALIZAR FIREBASE ADMIN ---
if (!getApps().length) {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    throw new Error("❌ Falta FIREBASE_SERVICE_ACCOUNT_JSON en las variables de entorno");
  }

  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

  initializeApp({
    credential: cert(serviceAccount),
  });
}
const db = getFirestore();

// --- INICIALIZAR OPENAI (SDK v4) ---
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --- SCRAPING BOLETINES (ejemplo: Corte IDH) ---
async function fetchNoticiasBoletin() {
  const url = "https://www.corteidh.or.cr/noticias.cfm";
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);

  const noticias = [];
  $(".noticias_lista li").each((i, el) => {
    noticias.push({
      titulo: $(el).find("h3").text().trim(),
      resumen: $(el).find("p").text().trim(),
      url: $(el).find("a").attr("href"),
      fecha: $(el).find(".fecha").text().trim() || new Date().toISOString(),
      fuente: "Corte IDH",
    });
  });
  return noticias;
}

// --- ANÁLISIS IA/GPT ---
async function analizarNoticiaConGPT(noticia) {
  const prompt = `
Eres un asistente legal. Analiza la siguiente noticia legal:
Título: ${noticia.titulo}
Resumen: ${noticia.resumen}
Responde solo JSON: 
{
  "relevancia": "alta|media|baja",
  "premium": true|false,
  "tagsAI": ["Derecho Constitucional", "Internacional"],
  "recomendacionIA": "¿Por qué es importante para el usuario?",
  "jurisprudenciaRelacionada": ["Caso X vs. Y", "Sentencia 123-2020"],
  "escribeResumenIA": "Resumen breve de 2 líneas"
}
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // más rápido/económico, usa "gpt-4o" si necesitas máxima calidad
      messages: [{ role: "system", content: prompt }],
      max_tokens: 300,
      temperature: 0.1,
    });

    const rawOutput = completion.choices[0]?.message?.content || "";
    const jsonStr = rawOutput.match(/\{.*\}/s)?.[0];
    return jsonStr ? JSON.parse(jsonStr) : {};
  } catch (e) {
    console.error("❌ Error analizando con GPT:", e.message);
    return {};
  }
}

// --- GUARDAR EN FIRESTORE ---
async function guardarNoticiaFirestore(noticia, analisisIA) {
  const docId = `${noticia.fuente}-${Buffer.from(noticia.titulo).toString("base64")}`;
  await db.collection("noticiasJuridicas").doc(docId).set(
    {
      ...noticia,
      ...analisisIA,
      creadoPor: "LitisBot",
      fechaRegistro: new Date().toISOString(),
    },
    { merge: true } // evita duplicados
  );
}

// --- ORQUESTADOR ---
export async function rutinaLitisBot() {
  try {
    const noticias = await fetchNoticiasBoletin();
    for (const noticia of noticias) {
      const analisisIA = await analizarNoticiaConGPT(noticia);
      await guardarNoticiaFirestore(noticia, analisisIA);
      console.log(`✔️ Publicada: ${noticia.titulo}`);
    }
  } catch (e) {
    console.error("❌ Error en rutinaLitisBot:", e.message);
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  rutinaLitisBot().catch(console.error);
}
