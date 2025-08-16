import axios from "axios";
import cheerio from "cheerio";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

// Inicializa Firebase Admin solo si no está inicializado
if (!admin.apps.length) admin.initializeApp();
const db = getFirestore();

const FUENTES = [
  // Fuente nacional (Poder Judicial de Perú)
  {
    nombre: "Poder Judicial",
    url: "https://www.pj.gob.pe/wps/wcm/connect/portalpjudicial/s_cnoticias/noticias/",
    tipo: "noticia",
    premium: false,
    extractor: html => {
      const $ = cheerio.load(html);
      return $(".noticia").map((i, el) => ({
        titulo: $(el).find(".titulo").text().trim(),
        resumen: $(el).find(".descripcion").text().trim(),
        url: "https://www.pj.gob.pe" + $(el).find("a").attr("href"),
        fecha: $(el).find(".fecha").text().trim() || new Date().toISOString(),
        fuente: "Poder Judicial",
        tipo: "noticia",
        premium: false
      })).get();
    }
  },
  // Fuente internacional (ONU)
  {
    nombre: "ONU Noticias",
    url: "https://news.un.org/es/news/topic/law-and-crime-prevention",
    tipo: "internacional",
    premium: true, // Marca premium para mostrar solo resumen a no suscritos
    extractor: html => {
      const $ = cheerio.load(html);
      return $(".views-row").map((i, el) => ({
        titulo: $(el).find(".field-content h2 a").text().trim(),
        resumen: $(el).find(".field-content .teaser__text").text().trim(),
        url: "https://news.un.org" + $(el).find(".field-content h2 a").attr("href"),
        fecha: $(el).find(".date-display-single").attr("content") || new Date().toISOString(),
        fuente: "ONU Noticias",
        tipo: "internacional",
        premium: true
      })).get();
    }
  },
  // Revista Derecho PUCP (premium)
  {
    nombre: "Revista Derecho PUCP",
    url: "https://revistas.pucp.edu.pe/index.php/derechopucp/issue/current",
    tipo: "revista",
    premium: true,
    extractor: html => {
      const $ = cheerio.load(html);
      return $(".obj_article_summary").map((i, el) => ({
        titulo: $(el).find(".title").text().trim(),
        resumen: $(el).find(".summary").text().trim(),
        url: $(el).find(".title a").attr("href"),
        fecha: $(el).find(".date").text().trim() || new Date().toISOString(),
        fuente: "Revista Derecho PUCP",
        tipo: "revista",
        premium: true
      })).get();
    }
  },
  // Agrega aquí más fuentes internacionales, revistas o boletines premium o libres.
];

export async function actualizarNoticiasYJurisprudencia() {
  let total = 0;
  let palabrasClave = {};

  for (const fuente of FUENTES) {
    try {
      const { data: html } = await axios.get(fuente.url);
      const extraidos = fuente.extractor(html);
      total += extraidos.length;

      extraidos.forEach(noticia => {
        // Tendencias
        noticia.titulo?.split(/\s+/).forEach(w => {
          w = w.toLowerCase();
          if (w.length > 3) palabrasClave[w] = (palabrasClave[w] || 0) + 1;
        });

        // Guarda noticia en Firestore (upsert)
        const docId = `${fuente.nombre}-${Buffer.from(noticia.titulo).toString("base64")}`;
        db.collection("noticiasJuridicas").doc(docId).set(noticia, { merge: true });
      });
    } catch (e) {
      console.error(`Error scraping ${fuente.nombre}:`, e.message);
    }
  }

  // Guarda tendencias
  await db.collection("tendenciasJuridicas").doc(formatDateKey()).set({
    palabrasClave,
    fecha: new Date().toISOString(),
    top10: Object.entries(palabrasClave).sort((a, b) => b[1] - a[1]).slice(0, 10)
  });

  return total;
}

function formatDateKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
