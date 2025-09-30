// backend/services/noticiasService.js
import axios from "axios";
import * as cheerio from "cheerio";
import { db } from "#services/myFirebaseAdmin.js";
import { MongoClient } from "mongodb";

// =========================
// Conexión MongoDB
// =========================
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const client = new MongoClient(MONGO_URI);

let mongoDb;
async function connectMongo() {
  if (!mongoDb) {
    await client.connect();
    mongoDb = client.db("legalbot");
    console.log("✅ MongoDB conectado en noticiasService");
  }
}
await connectMongo();

// =========================
// Fuentes configuradas
// =========================
const FUENTES = {
  juridicas: [
    {
      nombre: "Poder Judicial",
      url: "https://www.pj.gob.pe/wps/wcm/connect/portalpjudicial/s_cnoticias/noticias/",
      extractor: (html) => {
        const $ = cheerio.load(html);
        return $(".noticia")
          .map((_, el) => ({
            titulo: $(el).find(".titulo").text().trim(),
            resumen: $(el).find(".descripcion").text().trim(),
            url: (() => {
              const href = $(el).find("a").attr("href") || "";
              return href.startsWith("http") ? href : `https://www.pj.gob.pe${href}`;
            })(),
            fecha: $(el).find(".fecha").text().trim() || new Date().toISOString(),
            fuente: "Poder Judicial",
            tipo: "nacional",
            premium: false,
            fechaRegistro: new Date().toISOString(),
          }))
          .get();
      },
    },
  ],
  generales: [
    {
      nombre: "ONU Noticias",
      url: "https://news.un.org/es/news/topic/law-and-crime-prevention",
      extractor: (html) => {
        const $ = cheerio.load(html);
        return $(".views-row")
          .map((_, el) => ({
            titulo: $(el).find(".field-content h2 a").text().trim(),
            resumen: $(el).find(".field-content .teaser__text").text().trim(),
            url: (() => {
              const href = $(el).find(".field-content h2 a").attr("href") || "";
              return href.startsWith("http") ? href : `https://news.un.org${href}`;
            })(),
            fecha:
              $(el).find(".date-display-single").attr("content") ||
              new Date().toISOString(),
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
      extractor: (html) => {
        const $ = cheerio.load(html);
        return $(".obj_article_summary")
          .map((_, el) => ({
            titulo: $(el).find(".title").text().trim(),
            resumen: $(el).find(".summary").text().trim(),
            url: $(el).find(".title a").attr("href") || "",
            fecha: $(el).find(".date").text().trim() || new Date().toISOString(),
            fuente: "Revista Derecho PUCP",
            tipo: "revista",
            premium: true,
            fechaRegistro: new Date().toISOString(),
          }))
          .get();
      },
    },
  ],
};

// =========================
// Util: ID único
// =========================
const docIdFrom = (fuente, titulo) =>
  `${fuente}-${Buffer.from(titulo || "").toString("base64")}`;

// =========================
// Servicio principal
// =========================
/**
 * Actualiza noticias desde las fuentes configuradas.
 * @param {{ scope: 'juridicas'|'generales', especialidad?: string }} opts
 */
export async function actualizarNoticias({ scope, especialidad } = { scope: "juridicas" }) {
  if (!["juridicas", "generales"].includes(scope)) {
    throw new Error(`Scope inválido: ${scope}`);
  }

  const fuentes = FUENTES[scope] || [];
  let total = 0;
  let guardadas = 0;
  const porFuente = {};

  for (const fuente of fuentes) {
    try {
      const { data: html } = await axios.get(fuente.url, { timeout: 15000 });
      let items = fuente.extractor(html) || [];

      // Filtro opcional
      if (especialidad) {
        const kw = especialidad.toLowerCase();
        items = items.filter(
          (n) =>
            (n.titulo || "").toLowerCase().includes(kw) ||
            (n.resumen || "").toLowerCase().includes(kw)
        );
      }

      total += items.length;
      porFuente[fuente.nombre] = items.length;

      // Guardado en MongoDB y espejo en Firestore
      for (const n of items) {
        const id = docIdFrom(fuente.nombre, n.titulo);

        try {
          // Guardar en MongoDB
          await mongoDb.collection("noticias").updateOne(
            { _id: id },
            { $set: { ...n, scope, especialidad: especialidad || null } },
            { upsert: true }
          );

          // Espejo en Firestore
          await db.collection("noticias").doc(id).set(
            {
              ...n,
              scope,
              especialidad: especialidad || null,
            },
            { merge: true }
          );

          guardadas += 1;
        } catch (err) {
          console.warn(`⚠️ Error guardando noticia (${fuente.nombre}):`, err.message);
        }
      }
    } catch (err) {
      console.error(`❌ Error al procesar fuente ${fuente.nombre}:`, err.message);
    }
  }

  return { total, guardadas, porFuente };
}
