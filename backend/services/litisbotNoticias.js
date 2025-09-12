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

// --- Función principal ---
export async function actualizarNoticiasJuridicas() {
  const noticias = [];

  try {
    console.log("📡 Iniciando scraping de noticias del Poder Judicial...");

    // Petición HTTP con timeout preventivo
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

    // Guardar en Firestore con upsert (título + fuente como ID único)
    for (const noticia of noticias) {
      try {
        const docId = `${noticia.fuente}-${Buffer.from(noticia.titulo).toString("base64")}`;
        await db.collection("noticiasJuridicas").doc(docId).set(noticia, { merge: true });
        console.log(`✔️ Guardada en Firestore: ${noticia.titulo}`);
      } catch (err) {
        console.warn(`⚠️ No se pudo guardar noticia: ${noticia.titulo}`, err.message);
      }
    }

    console.log(`✅ Proceso finalizado. Noticias actualizadas: ${noticias.length}`);
    return noticias.length;
  } catch (e) {
    console.error("❌ Error en actualizarNoticiasJuridicas:", e.message || e);
    return 0;
  }
}
