// backend/scrapers/poderJudicial.js
// ============================================================
// 🏛️ Scraper Poder Judicial (Jurisprudencia)
// - Busca por palabra clave en el buscador público del PJ
// - Extrae listado preliminar (título, link)
// - Visita cada resultado y arma una resolución “tipo BúhoLex”
// - Guarda/actualiza en Mongo (modelo Jurisprudencia)
// - Se puede usar como CLI:  node backend/scrapers/poderJudicial.js "desalojo"
// ============================================================

import dotenv from "dotenv";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { fileURLToPath } from "url";
import { dbConnect, dbDisconnect } from "../services/db.js";
import Jurisprudencia from "../models/Jurisprudencia.js";

const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename); // por si luego lo necesitas
// Cargamos variables (usa .env.local desde la raíz del proyecto)
dotenv.config({ path: ".env.local" });

// ---------- Helpers genéricos ----------
function normText(t = "") {
  return String(t).replace(/\s+/g, " ").replace(/\u00a0/g, " ").trim();
}

function parseFechaPJ(raw = "") {
  // El PJ suele usar dd/MM/yyyy o similar
  const t = normText(raw);
  const m = t.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
  if (!m) return null;
  const [_, dd, mm, yyyy] = m;
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}

// ============================================================
// 1. Buscar en el listado del PJ
// ============================================================

async function scraperPJSearch(query) {
  if (!query) throw new Error("scraperPJSearch requiere query");

  const baseUrl = "https://jurisprudencia.pj.gob.pe/jurisprudenciaweb/faces/page/resultado.xhtml";
  const url = `${baseUrl}?no-back-button=1&palabras=${encodeURIComponent(query)}`;

  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`PJ search status ${resp.status}`);
  }
  const html = await resp.text();
  const $ = cheerio.load(html);

  // ⚠️ Selectores “aproximados”. Ajustamos en la práctica si cambia el HTML.
  const rows = $("table tbody tr");
  const list = [];

  rows.each((_, el) => {
    const $row = $(el);
    const titulo = normText($row.find("td:nth-child(2)").text()); // suele ser título
    const nro = normText($row.find("td:nth-child(1)").text()); // N° resolución, si aparece
    const linkRel = $row.find("a").attr("href") || "";
    if (!linkRel || !titulo) return;

    const link = linkRel.startsWith("http")
      ? linkRel
      : new URL(linkRel, baseUrl).toString();

    list.push({
      titulo,
      numero: nro || null,
      link,
    });
  });

  return list;
}

// ============================================================
// 2. Scrape de detalle de resolución (página + PDF si hay)
// ============================================================

async function scrapeDetallePJ(url) {
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`PJ detalle status ${resp.status}`);
  }
  const html = await resp.text();
  const $ = cheerio.load(html);

  // Estos selectores son orientativos y se ajustan viendo el HTML real
  const titulo = normText($("h1, h2, .titulo, .title").first().text()) || null;
  const resumen = normText(
    $("#resumen, .resumen, .summary, .texto").first().text()
  );

  // Ejemplo de metadatos tipo “Materia, Sala, Fecha”
  const materia = normText($("td:contains('Materia')").next().text());
  const sala = normText($("td:contains('Sala')").next().text());
  const fechaStr = normText($("td:contains('Fecha')").next().text());
  const fecha = parseFechaPJ(fechaStr);

  // PDF (si existe link)
  let pdfUrl = null;
  const pdfLink = $("a[href*='.pdf'], a[href*='pdf']").first().attr("href") || "";
  if (pdfLink) {
    pdfUrl = pdfLink.startsWith("http")
      ? pdfLink
      : new URL(pdfLink, url).toString();
  }

  // Construimos un objeto tipo “Jurisprudencia interna”
  return {
    fuente: "Poder Judicial",
    org: sala || "Corte Suprema",
    materia: materia || "Civil",
    numeroExpediente: null, // si luego encontramos selector, se completa
    numeroResolucion: null,
    fechaResolucion: fecha || null,
    titulo: titulo || "",
    sumilla: resumen || "",
    resumen,
    pdfUrl,
    enlaceOficial: url,
    tipo: "jurisprudencia_pj",
    estado: "vigente",
    // campos que ya tienes en tu modelo
  };
}

// ============================================================
// 3. Guardar / actualizar en Mongo
// ============================================================

async function savePJDoc(data) {
  if (!data || !data.titulo) return 0;

  const filter = {
    titulo: data.titulo,
    fuente: "Poder Judicial",
  };

  await Jurisprudencia.findOneAndUpdate(
    filter,
    { $set: data },
    { upsert: true, new: true }
  );

  return 1;
}

// ============================================================
// 4. Scraper principal (para usar desde CLI o cron)
// ============================================================

export async function scraperPJ(query = "") {
  if (!query) throw new Error("scraperPJ requiere una query");

  await dbConnect();

  console.log(`\n🔎 [PJ] Buscando resoluciones para: "${query}"...\n`);
  const prelim = await scraperPJSearch(query);
  console.log(`📝 [PJ] Se encontraron ${prelim.length} resultados preliminares\n`);

  let total = 0;

  for (const item of prelim) {
    try {
      console.log(`   • Procesando: ${item.titulo}`);
      const detalle = await scrapeDetallePJ(item.link);

      const payload = {
        ...detalle,
        titulo: detalle.titulo || item.titulo,
        numeroResolucion: detalle.numeroResolucion || item.numero || null,
        tags: [query.toLowerCase(), "poder judicial"].filter(Boolean),
      };

      total += await savePJDoc(payload);
    } catch (err) {
      console.error("   ⚠️ Error en una resolución:", err.message);
    }
  }

  console.log(`\n✅ [PJ] Guardadas/actualizadas ${total} resoluciones.\n`);

  await dbDisconnect();
  return total;
}

// ============================================================
// 5. CLI directo: node backend/scrapers/poderJudicial.js "desalojo"
//    (solo cuando se ejecuta este archivo directamente)
// ============================================================

const isDirectRun =
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  process.argv[1] === __filename;

if (isDirectRun) {
  const query = process.argv[2] || "desalojo";

  console.log(`\n▶️ Ejecutando scraperPJ por CLI con query: "${query}"\n`);

  scraperPJ(query)
    .then(() => {
      console.log("\n✅ CLI scraperPJ terminado correctamente.\n");
      process.exit(0);
    })
    .catch((err) => {
      console.error("\n❌ Error en CLI scraperPJ:", err);
      process.exit(1);
    });
}

// ============================================================
// Re-export para uso desde cron u otros módulos
// ============================================================

export { scraperPJ as scrapePJ };

