// jobs/litisbotScraper.js
import axios from "axios";
import * as cheerio from "cheerio";
import { Configuration, OpenAIApi } from "openai";
import admin from "firebase-admin";

// --- INICIALIZAR FIREBASE ADMIN ---
import serviceAccount from "../serviceAccountKey.json" assert { type: "json" };
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// --- INICIALIZAR OPENAI ---
const openai = new OpenAIApi(new Configuration({ apiKey: process.env.OPENAI_API_KEY }));

// --- SCRAPING BOLETINES EJEMPLO (modifica a tu fuente real) ---
async function fetchNoticiasBoletin() {
  const url = "https://www.corteidh.or.cr/noticias.cfm"; // Ejemplo: Corte IDH
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);

  // Extraer noticias (ajusta a tu HTML real)
  const noticias = [];
  $(".noticias_lista li").each((i, el) => {
    noticias.push({
      titulo: $(el).find("h3").text().trim(),
      resumen: $(el).find("p").text().trim(),
      url: $(el).find("a").attr("href"),
      fecha: $(el).find(".fecha").text().trim(),
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
  const { data } = await openai.createChatCompletion({
    model: "gpt-3.5-turbo", // o "gpt-4" si tienes acceso
    messages: [{ role: "system", content: prompt }],
    max_tokens: 300,
    temperature: 0.1,
  });

  try {
    const jsonStr = data.choices[0].message.content.match(/\{.*\}/s)[0];
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Error parsing GPT output", e);
    return {};
  }
}

// --- GUARDAR EN FIRESTORE ---
async function guardarNoticiaFirestore(noticia, analisisIA) {
  const ref = db.collection("noticiasJuridicas");
  await ref.add({
    ...noticia,
    ...analisisIA,
    creadoPor: "LitisBot",
    fechaRegistro: new Date().toISOString(),
  });
}

// --- ORQUESTADOR: Scrapea, analiza y publica ---
async function rutinaLitisBot() {
  const noticias = await fetchNoticiasBoletin();
  for (const noticia of noticias) {
    const analisisIA = await analizarNoticiaConGPT(noticia);
    await guardarNoticiaFirestore(noticia, analisisIA);
    console.log(`✔️ Publicada: ${noticia.titulo}`);
  }
}

rutinaLitisBot().catch(console.error);
