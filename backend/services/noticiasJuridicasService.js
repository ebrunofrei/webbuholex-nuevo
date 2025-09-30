// backend/services/noticiasJuridicasService.js
import { db, auth, storage } from "#services/myFirebaseAdmin.js";
import axios from "axios";
import * as cheerio from "cheerio";

/**
 * Extrae noticias solo del Poder Judicial
 */
export async function actualizarNoticiasJuridicas() {
  const noticias = [];

  try {
    console.log("📡 Iniciando scraping de noticias del Poder Judicial...");

    const { data: html } = await axios.get(
      "https://www.pj.gob.pe/wps/wcm/connect/portalpjudicial/s_cnoticias/noticias/",
      { timeout: 15000 }
    );

    const $ = cheerio.load(html);

    $(".noticia").each((i, el) => {
      const titulo = $(el).find(".titulo").text().trim();
      const resumen = $(el).find(".descripcion").text().trim();
      const url = $(el).find("a").attr("href");
      const fecha = $(el).find(".fecha").text().trim();

      if (titulo && url) {
        noticias.push({
          titulo,
          resumen,
          url: url.startsWith("http") ? url : `https://www.pj.gob.pe${url}`,
          fecha: fecha || new Date().toISOString(),
          fuente: "Poder Judicial",
          tipo: "nacional",
          premium: false,
          creadoPor: "ScraperAutomático",
          fechaRegistro: new Date().toISOString(),
        });
      }
    });

    console.log(`📰 Noticias extraídas: ${noticias.length}`);

    // Guardar en Firestore con upsert
    for (const noticia of noticias) {
      const docId = `${noticia.fuente}-${Buffer.from(noticia.titulo).toString("base64")}`;
      await mongoDb.collection("noticiasJuridicas").doc(docId).set(noticia, { merge: true });
    }

    console.log(`✅ Proceso finalizado. Noticias actualizadas: ${noticias.length}`);
    return noticias.length;
  } catch (e) {
    console.error("❌ Error en actualizarNoticiasJuridicas:", e.message || e);
    return 0;
  }
}

/**
 * Extrae noticias y jurisprudencia de múltiples fuentes
 */
const FUENTES = [
  {
    nombre: "Poder Judicial",
    url: "https://www.pj.gob.pe/wps/wcm/connect/portalpjudicial/s_cnoticias/noticias/",
    tipo: "noticia",
    premium: false,
    extractor: (html) => {
      const $ = cheerio.load(html);
      return $(".noticia")
        .map((i, el) => ({
          titulo: $(el).find(".titulo").text().trim(),
          resumen: $(el).find(".descripcion").text().trim(),
          url: "https://www.pj.gob.pe" + $(el).find("a").attr("href"),
          fecha: $(el).find(".fecha").text().trim() || new Date().toISOString(),
          fuente: "Poder Judicial",
          tipo: "noticia",
          premium: false,
          fechaRegistro: new Date().toISOString(),
        }))
        .get();
    },
  },
  {
    nombre: "ONU Noticias",
    url: "https://news.un.org/es/news/topic/law-and-crime-prevention",
    tipo: "internacional",
    premium: true,
    extractor: (html) => {
      const $ = cheerio.load(html);
      return $(".views-row")
        .map((i, el) => ({
          titulo: $(el).find(".field-content h2 a").text().trim(),
          resumen: $(el).find(".field-content .teaser__text").text().trim(),
          url: "https://news.un.org" + $(el).find(".field-content h2 a").attr("href"),
          fecha: $(el).find(".date-display-single").attr("content") || new Date().toISOString(),
          fuente: "ONU Noticias",
          tipo: "internacional",
          premium: true,
          fechaRegistro: new Date().toISOString(),
        }))
        .get();
    },
  },
  {
    nombre: "Revista Derecho PUCP",
    url: "https://revistas.pucp.edu.pe/index.php/derechopucp/issue/current",
    tipo: "revista",
    premium: true,
    extractor: (html) => {
      const $ = cheerio.load(html);
      return $(".obj_article_summary")
        .map((i, el) => ({
          titulo: $(el).find(".title").text().trim(),
          resumen: $(el).find(".summary").text().trim(),
          url: $(el).find(".title a").attr("href"),
          fecha: $(el).find(".date").text().trim() || new Date().toISOString(),
          fuente: "Revista Derecho PUCP",
          tipo: "revista",
          premium: true,
          fechaRegistro: new Date().toISOString(),
        }))
        .get();
    },
  },
];

/**
 * Procesa todas las fuentes y guarda resultados + tendencias
 */
export async function actualizarNoticiasYJurisprudencia() {
  let total = 0;
  const palabrasClave = {};

  for (const fuente of FUENTES) {
    try {
      const { data: html } = await axios.get(fuente.url, { timeout: 15000 });
      const extraidos = fuente.extractor(html);
      total += extraidos.length;

      for (const noticia of extraidos) {
        // Contar palabras clave
        noticia.titulo?.split(/\s+/).forEach((w) => {
          w = w.toLowerCase();
          if (w.length > 3) palabrasClave[w] = (palabrasClave[w] || 0) + 1;
        });

        // Guardar noticia en Firestore
        const docId = `${fuente.nombre}-${Buffer.from(noticia.titulo).toString("base64")}`;
        await mongoDb.collection("noticiasJuridicas").doc(docId).set(noticia, { merge: true });
      }
    } catch (e) {
      console.error(`❌ Error scraping ${fuente.nombre}:`, e.message);
    }
  }

  // Guardar tendencias
  await mongoDb.collection("tendenciasJuridicas").doc(formatDateKey()).set({
    palabrasClave,
    fecha: new Date().toISOString(),
    top10: Object.entries(palabrasClave)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10),
  });

  console.log(`✅ Noticias y jurisprudencia actualizadas: ${total}`);
  return total;
}

function formatDateKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
