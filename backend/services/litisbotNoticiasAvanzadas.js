import { db, auth, admin } from "./firebaseAdmin.js";
import axios from "axios";
import * as cheerio from "cheerio";

import { getFirestore } from "firebase-admin/firestore";

// --- Inicializa Firebase Admin solo una vez ---
if (! {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
       });
    } else {
       });
    }
    console.log("🔥 Firebase Admin inicializado");
  } catch (err) {
    console.error("❌ Error al inicializar Firebase Admin:", err.message);
  }
}

const db = getFirestore();

// --- Fuentes de noticias y jurisprudencia ---
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
  // Agrega más fuentes aquí...
];

// --- Función principal ---
export async function actualizarNoticiasYJurisprudencia() {
  let total = 0;
  const palabrasClave = {};

  for (const fuente of FUENTES) {
    try {
      const { data: html } = await axios.get(fuente.url, { timeout: 15000 });
      const extraidos = fuente.extractor(html);
      total += extraidos.length;

      for (const noticia of extraidos) {
        // --- Tendencias ---
        noticia.titulo?.split(/\s+/).forEach((w) => {
          w = w.toLowerCase();
          if (w.length > 3) palabrasClave[w] = (palabrasClave[w] || 0) + 1;
        });

        // --- Guarda noticia en Firestore (upsert) ---
        try {
          const docId = `${fuente.nombre}-${Buffer.from(noticia.titulo).toString("base64")}`;
          await db.collection("noticiasJuridicas").doc(docId).set(noticia, { merge: true });
        } catch (err) {
          console.warn(`⚠️ No se pudo guardar noticia: ${noticia.titulo}`, err.message);
        }
      }
    } catch (e) {
      console.error(`❌ Error scraping ${fuente.nombre}:`, e.message);
    }
  }

  // --- Guarda tendencias globales ---
  try {
    await db.collection("tendenciasJuridicas").doc(formatDateKey()).set({
      palabrasClave,
      fecha: new Date().toISOString(),
      top10: Object.entries(palabrasClave)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
    });
  } catch (err) {
    console.error("❌ Error guardando tendencias:", err.message);
  }

  console.log(`✅ Noticias y jurisprudencia actualizadas: ${total}`);
  return total;
}

// --- Genera clave de fecha (YYYY-MM-DD) ---
function formatDateKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
