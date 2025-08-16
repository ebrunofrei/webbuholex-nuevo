import axios from "axios";
import cheerio from "cheerio";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

// Inicializa solo si no está inicializado
if (!admin.apps.length) admin.initializeApp();

const db = getFirestore();

export async function actualizarNoticiasJuridicas() {
  const noticias = [];

  // Ejemplo: Scraping Poder Judicial
  const { data: html } = await axios.get("https://www.pj.gob.pe/wps/wcm/connect/portalpjudicial/s_cnoticias/noticias/");

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
      });
    }
  });

  // Puedes agregar scraping de otras webs aquí...

  // Guarda en Firestore (puedes hacer upsert para evitar duplicados)
  for (const noticia of noticias) {
    // Upsert por título+fuente+fecha
    const docId = `${noticia.fuente}-${Buffer.from(noticia.titulo).toString("base64")}`;
    await db.collection("noticiasJuridicas").doc(docId).set(noticia, { merge: true });
  }

  return noticias.length;
}
