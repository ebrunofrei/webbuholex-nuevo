// backend/scrapers/noticiasJuridicasHTML.js
// ============================================================
// 🦉 BúhoLex | Scraper HTML de noticias jurídicas reales
//    (LP Derecho, PJ, JusticiaTV, El Peruano, etc.)
// ============================================================

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import axios from "axios";
import * as cheerio from "cheerio";
import { dbConnect, dbDisconnect } from "../services/db.js";
import Noticia from "../models/Noticia.js";

// ----------------------------------------------------
// Fuentes HTML (de momento nos centramos en LP Derecho)
// ----------------------------------------------------
const FUENTES = [
  {
    nombre: "LP Derecho – Portada",
    url: "https://lpderecho.pe/category/noticias/",
    especialidad: "jurisprudencia",
    // Selector bastante flexible para LP: artículos del home
    selectorItem:
      "article[class*='jeg_post'], div[class*='jeg_post'], .jeg_posts article, article",
    selectorTitulo:
      ".jeg_post_title a, h3.jeg_post_title a, h2.jeg_post_title a, .entry-title a, .entry-title, h3 a, h2 a",
    selectorResumen:
      ".jeg_post_excerpt, .jeg_excerpt, .post-excerpt, .entry-content p, .content p, p",
    selectorEnlace:
      ".jeg_post_title a, h3.jeg_post_title a, h2.jeg_post_title a, .entry-title a, a[href]",
    selectorImagen: "img.wp-post-image, .jeg_thumb img, img",
  },

  // 👉 aquí luego re-activamos Poder Judicial, JusticiaTV, etc.
];

// ----------------------------------------------------
// Helpers
// ----------------------------------------------------
function normalizeUrl(base, href) {
  try {
    if (!href) return "";
    if (href.startsWith("http")) return href;
    return new URL(href, base).href;
  } catch {
    return "";
  }
}

function limpiarTexto(texto) {
  return String(texto || "").replace(/\s+/g, " ").trim();
}

// por si alguna fuente mete HTML en el resumen
function stripHtml(html) {
  return limpiarTexto(String(html || "").replace(/<[^>]+>/g, " "));
}

// ----------------------------------------------------
// Scraper por fuente
// ----------------------------------------------------
async function scrapeFuente(fuente) {
  console.log(`\n📡 Fuente: ${fuente.nombre}`);
  console.log(`URL listada: ${fuente.url}`);

  let html;
  try {
    const { data } = await axios.get(fuente.url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) BúhoLexBot/1.0",
      },
      timeout: 15000,
    });
    html = data;
  } catch (err) {
    console.error("  ❌ Error al obtener HTML:", err.message);
    return 0;
  }

  const $ = cheerio.load(html);
  const items = $(fuente.selectorItem);

  console.log(`  ▶ Items detectados en DOM: ${items.length}`);
  if (items.length === 0) {
    console.log(
      "  ⚠ Preview HTML (primeros 400 caracteres):\n",
      limpiarTexto(html).slice(0, 400),
      "\n"
    );
    return 0;
  }

  let nuevos = 0;

  for (const el of items.toArray()) {
    try {
      const $el = $(el);

      // 🔹 TÍTULO solo texto
      const titulo = limpiarTexto(
        $el.find(fuente.selectorTitulo).first().text()
      );
      if (!titulo) continue;

      // 🔹 RESUMEN -> texto plano (sin etiquetas)
      let resumenRaw = $el.find(fuente.selectorResumen).first().text();
      let resumen = limpiarTexto(stripHtml(resumenRaw));
      if (!resumen) resumen = titulo;

      // 🔹 ENLACE absoluto
      const enlaceRaw =
        $el.find(fuente.selectorEnlace).first().attr("href") || "";
      const enlace = normalizeUrl(fuente.url, enlaceRaw);
      if (!enlace) continue;

      // 🔹 IMAGEN destacada (opcional)
      const imagenRaw = $el.find(fuente.selectorImagen).first().attr("src") || "";
      const imagen = normalizeUrl(fuente.url, imagenRaw);

      const noticia = {
        titulo,
        resumen,
        contenido: resumen, // 👈 solo texto, nada de HTML
        fuente: fuente.nombre,
        enlace,
        especialidad: fuente.especialidad,
        tipo: "juridica",
        lang: "es",
        imagen,
      };

      // UPSERT por enlace
      const res = await Noticia.updateOne(
        { enlace },
        { $setOnInsert: noticia },
        { upsert: true }
      );

      if (res.upsertedCount > 0) {
        nuevos++;
      }
    } catch (err) {
      console.error("  ❌ Error item:", err.message);
    }
  }

  console.log(`  ✔ Noticias nuevas desde ${fuente.nombre}: ${nuevos}`);
  return nuevos;
}

// ----------------------------------------------------
// Script principal
// ----------------------------------------------------
async function run() {
  await dbConnect();
  console.log("\n✅ Conectado a MongoDB\n");

  let total = 0;
  for (const fuente of FUENTES) {
    total += await scrapeFuente(fuente);
  }

  console.log("\n=======================================");
  console.log("   SEED JURÍDICO COMPLETADO");
  console.log(`   Noticias nuevas insertadas: ${total}`);
  console.log("=======================================\n");

  await dbDisconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Error global:", err);
  dbDisconnect().finally(() => process.exit(1));
});
