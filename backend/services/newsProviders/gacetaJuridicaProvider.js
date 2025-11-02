// backend/services/newsProviders/gacetaJuridicaProvider.js
import puppeteer from "puppeteer";
import { normalizeNoticia, detectEspecialidad } from "./normalizer.js";

export async function fetchGacetaJuridica({ max = 10 } = {}) {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    await page.goto(
      "https://gacetajuridica.com.pe/productos/gaceta-constitucional/noticias-informes-opiniones/categorias/noticias",
      { waitUntil: "domcontentloaded", timeout: 60000 }
    );

    // esperar explÃ­citamente a que carguen los artÃ­culos
    await page.waitForSelector("article, .item.noticia, .views-row");

    const noticias = await page.$$eval("article, .item.noticia, .views-row", (els) =>
      els.slice(0, 10).map((el) => {
        const titulo = el.querySelector("h3, h2, .titulo, a")?.innerText?.trim() || "";
        const resumen = el.querySelector("p")?.innerText?.trim() || "";
        const enlace = el.querySelector("a")?.href || "";
        const fecha = el.querySelector(".fecha")?.innerText?.trim() || null;
        let imagen = el.querySelector("img")?.src || null;
        if (imagen && imagen.endsWith(".svg")) imagen = null;

        return {
          titulo,
          resumen,
          url: enlace,
          fecha,
          imagen,
          fuente: "Gaceta JurÃ­dica",
          tipo: "juridica",
        };
      })
    );

    // aplicar normalizador + clasificador
    return noticias.map((n) =>
      normalizeNoticia({
        ...n,
        especialidad: detectEspecialidad(`${n.titulo} ${n.resumen}`),
      })
    ).slice(0, max);

  } catch (err) {
    console.error("âŒ Error fetchGacetaJuridica:", err.message);
    return [];
  } finally {
    if (browser) await browser.close();
  }
}
