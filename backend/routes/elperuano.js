// routes/elperuano.js
import { Router } from "express";
import puppeteer from "puppeteer";
import * as cheerio from "cheerio";

const router = Router();

router.post("/", async (req, res) => {
  const { consulta } = req.body;
  const searchUrl = `https://busquedas.elperuano.pe/?s=${encodeURIComponent(consulta)}`;

  let browser;
  try {
    browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const page = await browser.newPage();
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 45000 });

    // Espera que cargue algún resultado
    await page.waitForSelector("div#resultados", { timeout: 15000 }).catch(() => {});

    // Extrae el HTML después de cargar
    const html = await page.content();
    const $ = cheerio.load(html);

    let resultado = [];
    $("div#resultados article, div#resultados .resultado").each((i, el) => {
      const titulo = $(el).find("h2 a, h3 a").text().trim() || $(el).find("h2, h3").text().trim();
      const url = $(el).find("h2 a, h3 a").attr("href") || "";
      const descripcion = $(el).find("p").text().trim();
      if (titulo && url) {
        resultado.push({
          titulo,
          url: url.startsWith("http") ? url : "https://busquedas.elperuano.pe" + url,
          descripcion,
          fuente: "elperuano.pe"
        });
      }
    });

    await browser.close();
    res.json({ resultado });
  } catch (err) {
    if (browser) await browser.close();
    res.status(500).json({ error: "Error al buscar en El Peruano", detalle: err.message });
  }
});

export default router;
