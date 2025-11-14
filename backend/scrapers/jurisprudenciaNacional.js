// backend/scrapers/jurisprudenciaNacional.js
// ============================================================
// 🦉 BúhoLex | Scraper Jurisprudencia Nacional Sistematizada
// - Fuente: https://jurisprudencia.pj.gob.pe/jurisprudenciaweb
// - Uso módulo:  import scrapeJNS from "./scrapers/jurisprudenciaNacional.js"
// - Uso CLI:     npm run scrape:jns -- "desalojo"
// ============================================================

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" }); // MONGODB_URI, JNS_DEBUG, etc.

import fs from "fs";
import puppeteer from "puppeteer";
import { dbConnect, dbDisconnect } from "../services/db.js";
import Jurisprudencia from "../models/Jurisprudencia.js";

// ---------- Flags de debug ----------
const JNS_DEBUG = String(process.env.JNS_DEBUG || "").toLowerCase() === "1";

// ---------- Helpers generales ----------
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normText(s = "") {
  return String(s).replace(/\s+/g, " ").trim();
}

// ---------- Constantes de la fuente ----------
const BASE_URL_RESULTADO =
  "https://jurisprudencia.pj.gob.pe/jurisprudenciaweb/faces/page/resultado.xhtml";

const BASE_URL_INICIO =
  "https://jurisprudencia.pj.gob.pe/jurisprudenciaweb/faces/page/inicio.xhtml";

/* ---------------------------------------------
 * Helper: construir ficha HTML (Fase A)
 * -------------------------------------------*/

function buildContenidoHtmlFromItem(item = {}) {
  const {
    recurso,
    numeroExpediente,
    pretensionDelito,
    tipoResolucion,
    fechaResolucion,
    salaSuprema,
    normaDerechoInterno,
    sumilla,
    palabrasClave,
    urlResolucion,
  } = item;

  const fechaTexto = fechaResolucion ? String(fechaResolucion) : "";

  const partes = [];

  partes.push("<article class=\"blx-ficha-jns\">");

  if (tipoResolucion || recurso) {
    partes.push("<header>");
    partes.push("<h1>");
    if (tipoResolucion) partes.push(`<span>${tipoResolucion}</span>`);
    if (recurso) partes.push(` – <span>${recurso}</span>`);
    partes.push("</h1>");
    if (numeroExpediente) {
      partes.push(`<p><strong>Expediente:</strong> ${numeroExpediente}</p>`);
    }
    partes.push("</header>");
  }

  partes.push("<section>");
  if (salaSuprema) {
    partes.push(`<p><strong>Sala / Órgano:</strong> ${salaSuprema}</p>`);
  }
  if (fechaTexto) {
    partes.push(`<p><strong>Fecha de resolución:</strong> ${fechaTexto}</p>`);
  }
  if (pretensionDelito) {
    partes.push(
      `<p><strong>Pretensión / delito:</strong> ${pretensionDelito}</p>`
    );
  }
  if (normaDerechoInterno) {
    partes.push(
      `<p><strong>Norma de derecho interno:</strong> ${normaDerechoInterno}</p>`
    );
  }
  partes.push("</section>");

  if (sumilla) {
    partes.push("<section>");
    partes.push("<h2>Sumilla</h2>");
    partes.push(`<p>${sumilla}</p>`);
    partes.push("</section>");
  }

  if (palabrasClave) {
    partes.push("<section>");
    partes.push("<h2>Palabras clave</h2>");
    partes.push(`<p>${palabrasClave}</p>`);
    partes.push("</section>");
  }

  if (urlResolucion) {
    partes.push("<section>");
    partes.push("<h2>Resolución</h2>");
    partes.push(
      `<p><a href="${urlResolucion}" target="_blank" rel="noopener noreferrer">Ver PDF / resolución en el portal del Poder Judicial</a></p>`
    );
    partes.push("</section>");
  }

  partes.push("</article>");

  return partes.join("\n");
}

/* ---------------------------------------------
 * Guardado en Mongo
 * -------------------------------------------*/

async function saveOrUpdateJurisprudencia(data = {}) {
  // Si ni título ni expediente, no guardamos
  if (!data.titulo && !data.numeroExpediente) return null;

  // Filtro mínimo para evitar duplicados
  const filtro = { fuente: "PJ - Jurisprudencia Nacional" };
  if (data.numeroExpediente) {
    filtro.numeroExpediente = data.numeroExpediente;
  } else if (data.titulo) {
    filtro.titulo = data.titulo;
  }

  // 🧷 Aseguramos tener urlResolucion y linkPdf coherentes
  const urlResolucion =
    data.urlResolucion || data.linkPdf || data.url || data.href || "";

  const payload = {
    ...data,
    urlResolucion,
    linkPdf: urlResolucion || data.linkPdf || "",
    fuente: "PJ - Jurisprudencia Nacional",
    updatedAt: new Date(),
  };

  // ⛔ Bypass al schema de Mongoose (sin strict)
  await Jurisprudencia.collection.updateOne(
    filtro,
    { $set: payload },
    { upsert: true }
  );

  return true;
}

// -------------------------------------------------------------
// Extraer listado de resoluciones desde página de resultados JNS
// -------------------------------------------------------------
async function scrapeListadoJNS(page) {
  const payload = await page.evaluate(() => {
    const norm = (s) =>
      (s || "")
        .replace(/\u00a0/g, " ") // NBSP → espacio normal
        .replace(/\s+/g, " ")
        .trim();

    // Panel que contiene TODAS las tarjetas de resultados
    const panel = document.querySelector('#formBuscador\\:panel');

    const debug = {
      foundPanel: !!panel,
      panelId: panel ? panel.id : null,
      totalRf: 0,
      totalCards: 0,
      sampleIds: [],
      allRfIds: [],
    };

    const resoluciones = [];

    if (panel) {
      debug.foundPanel = true;
      debug.panelId = panel.id;
    }

    // 1) Miramos TODOS los div.rf-p de la página
    const allRf = Array.from(document.querySelectorAll("div.rf-p"));
    debug.allRfIds = allRf.map((d) => d.id || "").slice(0, 40); // 👈 para debug

    // 2) Nos quedamos solo con los que parecen tarjetas de resultado
    //    id="formBuscador:repeat:0:j_idt455", etc.
    const rfDivs = allRf.filter(
      (d) => d.id && d.id.indexOf("formBuscador:repeat:") !== -1
    );

    // Debug de conteo
    debug.totalRf = rfDivs.length;
    debug.sampleIds = rfDivs.slice(0, 5).map((d) => d.id);

    const getCampoEnFila = (body, etiqueta) => {
      const rows = Array.from(body.querySelectorAll(".row"));
      const row = rows.find((r) => r.textContent.includes(etiqueta));
      if (!row) return "";

      const bold = Array.from(row.querySelectorAll(".txtbold")).find((b) =>
        b.textContent.includes(etiqueta)
      );

      if (!bold) return "";

      const col = bold.parentElement?.nextElementSibling || bold.parentElement;
      return norm(col?.textContent || "");
    };

    for (const div of rfDivs) {
      const header = div.querySelector(".rf-p-hdr");
      const body = div.querySelector(".rf-p-b");
      if (!header || !body) continue;

      // Encabezado: Recurso + Nº expediente
      const headerSpans = header.querySelectorAll("span[style*='font-weight']");
      const recurso = norm(headerSpans[0]?.textContent || "");
      const numero = norm(headerSpans[1]?.textContent || "");

      // Campos internos (coinciden con lo del HTML real)
      const pretensionDelito =
        getCampoEnFila(body, "Pretensión/Delito:") ||
        getCampoEnFila(body, "Pretensión / Delito");
      const tipoResolucion = getCampoEnFila(body, "Tipo Resolución:");
      const fechaResolucion = getCampoEnFila(body, "Fecha Resolución:");
      const salaSuprema = getCampoEnFila(body, "Sala Suprema:");
      const normaDerechoInterno = getCampoEnFila(
        body,
        "Norma de Derecho Interno:"
      );
      const sumilla = getCampoEnFila(body, "Sumilla:");
      const palabrasClave = getCampoEnFila(body, "Palabras Clave:");

      // Link a la resolución PDF/Word
      const linkResolucion = body.querySelector('a[href*="ServletDescarga"]');
      const hrefResolucion = linkResolucion
        ? linkResolucion.getAttribute("href") || ""
        : "";
      const urlResolucion = hrefResolucion
        ? hrefResolucion.startsWith("http")
          ? hrefResolucion
          : window.location.origin + hrefResolucion
        : "";

      resoluciones.push({
        recurso,
        numeroExpediente: numero,
        pretensionDelito,
        tipoResolucion,
        fechaResolucion,
        salaSuprema,
        normaDerechoInterno,
        sumilla,
        palabrasClave,
        urlResolucion,
      });
    }

    debug.totalCards = resoluciones.length;
    window._JNS_LAST_DEBUG = debug;

    return {
      ...debug,
      resoluciones,
    };
  });

  console.log("[JNS] Debug listado:", {
    foundPanel: payload.foundPanel,
    panelId: payload.panelId,
    totalRf: payload.totalRf,
    totalCards: payload.totalCards,
    sampleIds: payload.sampleIds,
  });

  if (!payload.foundPanel || !payload.totalRf || !payload.totalCards) {
    throw new Error(
      `[JNS] scrapeListadoJNS: panel=${payload.panelId}, ` +
        `rf-divs=${payload.totalRf}, cards=${payload.totalCards}, ` +
        `sampleIds=${JSON.stringify(payload.sampleIds || [])}`
    );
  }

  // Lo que usan el resto de funciones
  return payload.resoluciones;
}

/* ---------------------------------------------
 * Scraper principal
 * -------------------------------------------*/

export async function scrapeJNS(query = "") {
  if (!query) throw new Error("Falta query para scrapeJNS");

  await dbConnect();
  console.log(
    `\n[JNS] Conectado a MongoDB. Buscando resoluciones para: "${query}"...\n`
  );

  let browser;
  let totalGuardadas = 0;

  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({
      "Accept-Language": "es-PE,es;q=0.9,en;q=0.8",
    });

    await page.setViewport({ width: 1280, height: 800 });

    // 1. Ir a la página de INICIO (flujo real del PJ)
    console.log("[JNS] Navegando a la página de inicio...");
    await page.goto(BASE_URL_INICIO, {
      waitUntil: "networkidle2",
      timeout: 120000,
    });

    await delay(3000);

    if (JNS_DEBUG) {
      try {
        const html = await page.content();
        fs.writeFileSync("debug-jns-inicial.html", html, "utf8");
        await page.screenshot({ path: "debug-jns-inicial.png", fullPage: true });
        console.log(
          "[JNS][DEBUG] HTML inicial guardado en debug-jns-inicial.html y captura en debug-jns-inicial.png"
        );
      } catch (e) {
        console.warn("[JNS][DEBUG] No se pudo guardar debug inicial:", e);
      }
    }

    // 2. Input de texto GENERAL: formBuscador:txtBusqueda
    console.log("[JNS] Buscando input de texto para la query...");
    await page.waitForSelector('#formBuscador\\:txtBusqueda', {
      visible: true,
      timeout: 60000,
    });

    await page.focus('#formBuscador\\:txtBusqueda');
    await page.keyboard.down("Control");
    await page.keyboard.press("A");
    await page.keyboard.up("Control");
    await page.keyboard.press("Backspace");
    await page.type('#formBuscador\\:txtBusqueda', query, { delay: 40 });

    // 3. Click en el botón de buscar de INICIO (j_idt31)
    console.log("[JNS] Lanzando búsqueda en la web del PJ...");
    await Promise.all([
      page.click('input[type="image"][name="formBuscador:j_idt31"]'),
      page
        .waitForNavigation({
          waitUntil: "networkidle2",
          timeout: 120000,
        })
        .catch(() => {
          // En algunos casos es AJAX, así que no reventamos
        }),
    ]);

    await delay(3000);

    if (JNS_DEBUG) {
      try {
        const htmlAfterClick = await page.content();
        fs.writeFileSync("debug-jns-postclick.html", htmlAfterClick, "utf8");
        await page.screenshot({
          path: "debug-jns-postclick.png",
          fullPage: true,
        });
        console.log(
          "[JNS][DEBUG] HTML post-click guardado en debug-jns-postclick.html y captura en debug-jns-postclick.png"
        );
      } catch (e) {
        console.warn("[JNS][DEBUG] No se pudo guardar debug post-click:", e);
      }
    }

    console.log("[JNS] URL actual después de buscar:", page.url());

    // 4. Asegurarnos de estar en la página de RESULTADOS
    await page.waitForSelector('#formBuscador\\:panel', {
      timeout: 60000,
    });

    // 5. Parsear listado con la lógica nueva
    console.log("[JNS] Extrayendo listado de resoluciones...");
    const lista = await scrapeListadoJNS(page);
    console.log(`[JNS] Se encontraron ${lista.length} resoluciones preliminares.`);

    if (!lista.length) {
      console.warn("[JNS] ⚠ No se encontraron resultados para esa query.");
    }

    // 6. Guardar en Mongo con mapeo coherente + contenidoHTML (Fase A)
    for (const item of lista) {
      try {
        const tituloCompuesto =
          normText(`${item.tipoResolucion || ""} ${item.recurso || ""}`) ||
          item.numeroExpediente;

        const contenidoHTML = buildContenidoHtmlFromItem(item);

        await saveOrUpdateJurisprudencia({
          titulo: tituloCompuesto,
          organo: item.salaSuprema,
          fechaResolucion: item.fechaResolucion,
          especialidad: "",
          numeroExpediente: item.numeroExpediente,
          sumilla: item.sumilla || item.pretensionDelito,
          fuenteUrl: BASE_URL_RESULTADO,
          urlResolucion: item.urlResolucion,

          // Contenido de ficha (Fase A)
          contenidoHTML,
          pretensionDelito: item.pretensionDelito,
          tipoResolucion: item.tipoResolucion,
          salaSuprema: item.salaSuprema,
          palabrasClave: item.palabrasClave,
          normaDerechoInterno: item.normaDerechoInterno,

          // Campos que luego podremos rellenar con Ver Ficha real
          baseLegal: "",
          parteResolutiva: "",
          estado: "Vigente",
          tags: ["jns", "interno"],
        });

        totalGuardadas += 1;
      } catch (err) {
        console.error("[JNS] Error guardando resolución:", err.message);
      }
    }

    console.log(
      `\n[JNS] Guardadas/actualizadas ${totalGuardadas} resoluciones.\n`
    );
    return totalGuardadas;
  } catch (err) {
    console.error("\n❌ Error en scraperJNS:", err);
    throw err;
  } finally {
    if (browser) {
      try {
        await browser.close();
        console.log("[JNS] Navegador cerrado.");
      } catch {
        /* ignore */
      }
    }
    await dbDisconnect();
    console.log("[JNS] Mongo desconectado.\n");
  }
}

// ============================================================
// CLI directo: node backend/scrapers/jurisprudenciaNacional.js "desalojo"
// ó npm run scrape:jns -- "desalojo"
// ============================================================

const isDirectRun =
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  process.argv[1] &&
  process.argv[1].includes("jurisprudenciaNacional.js");

if (isDirectRun) {
  const query = process.argv[2] || "desalojo";

  console.log(
    `\n▶️  Ejecutando scraperJNS por CLI con query: "${query}"\n`
  );

  scrapeJNS(query)
    .then(() => {
      console.log("\n✅ CLI scraperJNS terminado correctamente.\n");
      process.exit(0);
    })
    .catch((err) => {
      console.error("\n❌ Error en CLI scraperJNS:", err);
      process.exit(1);
    });
}

export default scrapeJNS;
