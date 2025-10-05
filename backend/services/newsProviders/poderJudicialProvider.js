import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { Noticia } from "../../models/Noticia.js";
import { normalizeNoticia } from "./normalizer.js"; // ← usar tu normalizer unificado

puppeteer.use(StealthPlugin());

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 400;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 400);
    });
  });
}

export async function fetchPoderJudicial({ max = 10 } = {}) {
  let browser;
  try {
    console.log("⚖️ Iniciando scraping Poder Judicial...");

    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.goto("https://www.gob.pe/institucion/pj/noticias", {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    await autoScroll(page);
    await page.waitForSelector("h3 a", { timeout: 60000 });

    const noticias = await page.$$eval("h3 a", (links) =>
      links.map((a) => {
        const card = a.closest("div.news-card, article");
        const titulo = a.innerText?.trim() || "Noticia PJ";
        const enlace = a.href;
        const resumen = card?.querySelector("p")?.innerText?.trim() || "";
        const imagen =
          card?.querySelector("img")?.src ||
          "https://static.wixstatic.com/media/11062b_0cf2db142b8540f598b127f4693df95d~mv2.png";

        return {
          titulo,
          resumen,
          contenido: resumen,
          fuente: "Poder Judicial",
          enlace,
          tipo: "juridica",
          fecha: new Date().toISOString(),
          imagen,
          autor: "",
          etiquetas: [],
        };
      })
    );

    console.log(`📊 Noticias PJ capturadas: ${noticias.length}`);

    let guardadas = 0;
    for (const n of noticias.slice(0, max)) {
      try {
        await Noticia.updateOne(
          { enlace: n.enlace },
          { $setOnInsert: normalizeNoticia(n) },
          { upsert: true }
        );
        guardadas++;
      } catch (err) {
        console.error(`⚠️ Error guardando noticia PJ: ${n.titulo}`, err.message);
      }
    }

    console.log(`📥 Noticias PJ guardadas en MongoDB: ${guardadas}`);
    return noticias.slice(0, max);
  } catch (err) {
    console.error("❌ Error fetchPoderJudicial:", err.message);
    return [];
  } finally {
    if (browser) await browser.close();
  }
}

// ✅ Alias para coincidir con importaciones antiguas y nuevas
export { fetchPoderJudicial as fetchNoticiasPJ, fetchPoderJudicial as fetchPJ };
