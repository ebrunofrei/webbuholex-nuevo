// backend/scrapers/noticiasJuridicasPJ.js
// ============================================================
// 🦉 BúhoLex | Seed de Noticias Jurídicas (Poder Judicial & afines)
// - Lee RSS/noticias de fuentes jurídicas
// - Normaliza al modelo Noticia con tipo = "juridica"
// - Upsert por enlace (usa índice único de Noticia)
// ============================================================

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" }); // ajusta si tu backend usa otro .env

import RSSParser from "rss-parser";
import { dbConnect, dbDisconnect } from "../services/db.js";
import Noticia from "../models/Noticia.js";

// ---------- Config básica ----------
const parser = new RSSParser({
  timeout: 15000,
  headers: {
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) BúhoLexNoticias/1.0",
    accept: "application/rss+xml,application/xml;q=0.9,*/*;q=0.8",
  },
});

// ⚠️ Pon aquí las URLs REALES de RSS/feeds del PJ.
// Puedes sacarlas del listado oficial de RSS del Poder Judicial. :contentReference[oaicite:4]{index=4}
const FEEDS = [
  // -----------------------------
  // PODER JUDICIAL DEL PERÚ
  // -----------------------------
  {
    url: "https://www.pj.gob.pe/wps/wcm/connect/rss-pj/noticias/noticias-wcm?MOD=AJPERES",
    fuente: "Poder Judicial",
    especialidad: "procesal",
  },

  // -----------------------------
  // JUSTICIA TV (PJ)
  // -----------------------------
  {
    url: "https://www.justiciatv.pe/rss/noticias.xml",
    fuente: "Poder Judicial",
    especialidad: "procesal",
  },
  {
    url: "https://www.justiciatv.pe/rss/judiciales.xml",
    fuente: "Poder Judicial",
    especialidad: "procesal",
  },

  // -----------------------------
  // EL PERUANO – NORMAS LEGALES
  // -----------------------------
  {
    url: "https://elperuano.pe/rss/NormasLegales.xml",
    fuente: "El Peruano",
    especialidad: "administrativo",
  },
  {
    url: "https://elperuano.pe/rss/judicial.xml",
    fuente: "El Peruano",
    especialidad: "procesal",
  },
  {
    url: "https://elperuano.pe/rss/penal.xml",
    fuente: "El Peruano",
    especialidad: "penal",
  },
  {
    url: "https://elperuano.pe/rss/civil.xml",
    fuente: "El Peruano",
    especialidad: "civil",
  },
  {
    url: "https://elperuano.pe/rss/laboral.xml",
    fuente: "El Peruano",
    especialidad: "laboral",
  },
];

// ---------- Helpers ----------
function parseFecha(input) {
  if (!input) return new Date();
  const d = new Date(input);
  return Number.isNaN(+d) ? new Date() : d;
}

function limpiarHtmlToText(html = "") {
  return String(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------- Proceso principal ----------
async function importarNoticiasJuridicas() {
  await dbConnect();

  let total = 0;
  let nuevos = 0;
  let yaExistian = 0;

  for (const feed of FEEDS) {
    console.log(`\n📡 Leyendo feed jurídico: ${feed.url}`);
    let rss;
    try {
      rss = await parser.parseURL(feed.url);
    } catch (err) {
      console.error("  ❌ Error al leer RSS:", err.message || err);
      continue;
    }

    const items = rss?.items || [];
    console.log(`  → ${items.length} ítems encontrados`);

    for (const item of items) {
      const enlace =
        (item.link || item.guid || "").toString().trim();
      if (!enlace) continue;

      const titulo =
        (item.title || "(Sin título)").toString().trim();

      const contenidoHtml =
        item["content:encoded"] ||
        item.content ||
        item.summary ||
        item.contentSnippet ||
        "";

      const resumen =
        (item.contentSnippet ||
          item.summary ||
          limpiarHtmlToText(contenidoHtml))
          .toString()
          .trim();

      const contenido =
        limpiarHtmlToText(contenidoHtml) || resumen;

      const fecha = parseFecha(
        item.isoDate || item.pubDate || item.date
      );

      const doc = {
        titulo,
        resumen,
        contenido,
        fuente: feed.fuente,
        enlace,
        imagen: item.enclosure?.url || "",
        fecha,
        tipo: "juridica",
        especialidad: feed.especialidad || "general",
        lang: "es",
      };

      try {
        const res = await Noticia.updateOne(
          { enlace },
          { $setOnInsert: doc },
          { upsert: true }
        );

        total++;
        if (res.upsertedCount && res.upsertedCount > 0) {
          nuevos++;
          console.log(`    ✔ Nueva noticia jurídica: ${titulo}`);
        } else {
          yaExistian++;
        }
      } catch (err) {
        console.error("    ❌ Error al guardar noticia:", err.message || err);
      }
    }
  }

  console.log("\n======================================");
  console.log("  ✅ Seed noticias jurídicas completado");
  console.log(`  Total procesadas : ${total}`);
  console.log(`  Nuevas insertadas: ${nuevos}`);
  console.log(`  Ya existentes    : ${yaExistian}`);
  console.log("======================================\n");

  await dbDisconnect();
  process.exit(0);
}

importarNoticiasJuridicas().catch((err) => {
  console.error("❌ Error global en importarNoticiasJuridicas:", err);
  dbDisconnect().finally(() => process.exit(1));
});
