import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";

const DIR = path.join(process.cwd(), "data/jurisprudencia/tc-pdf");

export async function scrapeTC(query = "filiación") {
  const url = `https://www.tc.gob.pe/buscador/?texto=${encodeURIComponent(query)}`;
  const { data: html } = await axios.get(url);

  const $ = cheerio.load(html);
  const results = [];

  $(".resultado-busqueda").each((i, el) => {

    const title = $(el).find(".titulo-sentencia").text().trim();
    const link = $(el).find("a").attr("href");

    results.push({ title, link });
  });

  // Descargar PDFs
  for (const r of results) {
    try {
      const pdf = await axios.get(r.link, { responseType: "arraybuffer" });
      const filename = `${Date.now()}.pdf`;
      const filePath = path.join(DIR, filename);
      fs.writeFileSync(filePath, pdf.data);
      r.pdfPath = filePath;
    } catch (err) {
      console.error("Error bajando pdf TC:", err.message);
    }
  }

  return results;
}

// backend/scrapers/poderJudicial.js
if (import.meta.url === `file://${process.argv[1]}`) {
  const query = process.argv[2] || "desalojo";
  scraperPJ(query)
    .then(() => {
      console.log("[PJ] Scraping completado para:", query);
      process.exit(0);
    })
    .catch((err) => {
      console.error("[PJ] Error:", err);
      process.exit(1);
    });
}
