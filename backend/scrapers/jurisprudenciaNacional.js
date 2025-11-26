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
import crypto from "crypto";
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

/**
 * Convierte "dd/mm/yyyy" → Date (UTC local) o null
 */
function parseFechaPeru(s) {
  if (!s) return null;
  if (s instanceof Date) return s;

  const str = String(s).trim();
  const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;

  const [, dd, mm, yyyy] = m;
  const d = Number(dd);
  const mIdx = Number(mm) - 1;
  const y = Number(yyyy);

  if (
    Number.isNaN(d) ||
    Number.isNaN(mIdx) ||
    Number.isNaN(y) ||
    d <= 0 ||
    d > 31 ||
    mIdx < 0 ||
    mIdx > 11
  ) {
    return null;
  }

  return new Date(y, mIdx, d);
}

/**
 * Normaliza palabras clave:
 * - acepta string ("a; b, c") o array
 * - devuelve array limpio y sin duplicados
 */
function parsePalabrasClave(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .map((s) => normText(s || ""))
          .filter((s) => s.length > 0)
      )
    );
  }

  const raw = String(value)
    .replace(/;/g, ",")
    .split(",")
    .map((s) => normText(s));

  return Array.from(new Set(raw.filter((s) => s.length > 0)));
}

/**
 * Construye un hash antifraude / anti-duplicado
 * basado en los campos más estables de la resolución.
 */
function buildHashKey({
  numeroExpediente,
  tipoResolucion,
  salaSuprema,
  fechaResolucion,
}) {
  const base = [
    numeroExpediente || "",
    tipoResolucion || "",
    salaSuprema || "",
    fechaResolucion ? String(fechaResolucion).slice(0, 10) : "",
  ]
    .join("|")
    .toLowerCase();

  if (!base.trim()) return null;

  return crypto.createHash("sha1").update(base).digest("hex");
}

// ---------- Constantes de la fuente ----------
const BASE_URL_RESULTADO =
  "https://jurisprudencia.pj.gob.pe/jurisprudenciaweb/faces/page/resultado.xhtml";

const BASE_URL_INICIO =
  "https://jurisprudencia.pj.gob.pe/jurisprudenciaweb/faces/page/inicio.xhtml";

/* ---------------------------------------------
 * Helper: construir ficha HTML sintética (Fase A)
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

  partes.push('<article class="blx-ficha-jns">');

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
 * Helper Fase B: Scraping de ficha completa
 * -------------------------------------------*/

/**
 * Navega a la URL de detalle (ficha RichFaces) y devuelve:
 * - html: contenido HTML del contenedor principal
 * - texto: texto plano normalizado
 * - pdfUrl: URL del PDF si hay link en la ficha
 */
async function scrapeDetalleJNS(browser, detalleUrl) {
  // Guardrail básico
  if (!detalleUrl) {
    console.log("[JNS] scrapeDetalleJNS llamado SIN detalleUrl");
    return null;
  }

  console.log("[JNS] Abriendo detalle JNS:", detalleUrl);

  let page;

  try {
    page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({
      "Accept-Language": "es-PE,es;q=0.9,en;q=0.8",
    });

    await page.goto(detalleUrl, {
      waitUntil: "networkidle2",
      timeout: 120000,
    });

    await delay(2000);

    // Debug opcional: HTML + screenshot de la ficha
    if (JNS_DEBUG) {
      try {
        const htmlDebug = await page.content();
        fs.writeFileSync("debug-jns-detalle.html", htmlDebug, "utf8");
        await page.screenshot({
          path: "debug-jns-detalle.png",
          fullPage: true,
        });
        console.log(
          "[JNS][DEBUG] HTML detalle guardado en debug-jns-detalle.html y captura en debug-jns-detalle.png"
        );
      } catch (e) {
        console.warn("[JNS][DEBUG] No se pudo guardar debug detalle:", e);
      }
    }

        const result = await page.evaluate(() => {
      const norm = (s) =>
        (s || "")
          .replace(/\u00a0/g, " ")
          .replace(/\s+/g, " ")
          .trim();

      // Buscamos el contenedor principal de la ficha
      const contenedor =
        document.querySelector("#formFicha") ||
        document.querySelector("#formPrincipal") ||
        document.querySelector("div[id*='formFicha']") ||
        document.querySelector("div.rich-panel") ||
        document.body;

      const html = contenedor ? contenedor.innerHTML : document.body.innerHTML;
      const texto = norm(contenedor ? contenedor.textContent : document.body.textContent);

      const linkPdf =
        contenedor.querySelector('a[href*="ServletDescarga"]') ||
        document.querySelector('a[href*="ServletDescarga"]');

      const hrefPdf = linkPdf?.getAttribute("href") || "";
      const pdfUrl = hrefPdf
        ? hrefPdf.startsWith("http")
          ? hrefPdf
          : window.location.origin + hrefPdf
        : "";

      const tituloNode =
        contenedor.querySelector(".txtbold") ||
        contenedor.querySelector("h1, h2");

      const titulo = norm(tituloNode?.textContent || "");

      return {
        html,
        texto,
        pdfUrl,
        titulo,
      };
    });

    console.log("[JNS] Resultado detalle:", {
      lenHtml: (result.html || "").length,
      lenTexto: (result.texto || "").length,
      pdfUrl: result.pdfUrl,
      titulo: result.titulo,
    });

    return {
      html: result.html || "",
      texto: result.texto || "",
      pdfUrl: result.pdfUrl || "",
      titulo: result.titulo || "",
    };

  } catch (err) {
    console.error("[JNS] Error en scrapeDetalleJNS:", err.message);
    return null;
  } finally {
    if (page) {
      try {
        await page.close();
      } catch {
        /* ignore */
      }
    }
  }
}

/* ---------------------------------------------
 * Guardado en Mongo (normalizado, con hash)
 * -------------------------------------------*/

async function saveOrUpdateJurisprudencia(data = {}) {
  // Si ni título ni expediente, no guardamos
  if (!data.titulo && !data.numeroExpediente) return null;

  // Fecha como Date real
  const fechaResolucion =
    data.fechaResolucion instanceof Date
      ? data.fechaResolucion
      : parseFechaPeru(data.fechaResolucion);

  // Palabras clave como array
  const palabrasClaveArr = parsePalabrasClave(
    data.palabrasClave || data.palabrasClaveRaw
  );

  // URL de resolución / PDF (priorizamos pdfUrl si viene)
  const urlResolucion =
    data.pdfUrl ||
    data.urlResolucion ||
    data.linkPdf ||
    data.url ||
    data.href ||
    "";

  // Hash antifraude / duplicado
  const hash = buildHashKey({
    numeroExpediente: data.numeroExpediente,
    tipoResolucion: data.tipoResolucion,
    salaSuprema: data.salaSuprema,
    fechaResolucion,
  });

  // Filtro mínimo para evitar duplicados (además del hash)
  const filtro = {
    fuente: "PJ - Jurisprudencia Nacional",
  };

  if (hash) {
    filtro.hash = hash;
  } else if (data.numeroExpediente) {
    filtro.numeroExpediente = data.numeroExpediente;
  } else if (data.titulo) {
    filtro.titulo = data.titulo;
  }

  const ahora = new Date();

  const payload = {
    ...data,
    fechaResolucion,
    palabrasClave: palabrasClaveArr,
    urlResolucion,
    pdfUrl: urlResolucion || data.linkPdf || "",
    linkPdf: urlResolucion || data.linkPdf || "",
    fuente: "PJ - Jurisprudencia Nacional",
    origen: "JNS",
    estado: data.estado || "Vigente",
    hash: hash || data.hash || undefined,
    updatedAt: ahora,
  };

  // ⛔ Bypass al schema de Mongoose (sin strict) pero
  // ✅ aseguramos createdAt / fechaScraping / contextVersion en inserciones nuevas
  await Jurisprudencia.collection.updateOne(
    filtro,
    {
      $set: payload,
      $setOnInsert: {
        createdAt: ahora,
        fechaScraping: ahora,
        contextVersion: 1,
      },
    },
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

    // Panel principal de resultados (si esto no existe, no hay nada)
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

    // 1) Capturar TODOS los rf-p (RichFaces Panels)
    const allRf = Array.from(document.querySelectorAll("div.rf-p"));
    debug.allRfIds = allRf.map((d) => d.id || "").slice(0, 40);

    // 2) Filtrar solo los rf-p de resultados
    const rfDivs = allRf.filter(
      (d) => d.id && d.id.includes("formBuscador:repeat:")
    );

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

    // 3) Extraer información de cada tarjeta
    for (const div of rfDivs) {
      const header = div.querySelector(".rf-p-hdr");
      const body = div.querySelector(".rf-p-b");
      if (!header || !body) continue;

      // Datos del encabezado
      const spans = header.querySelectorAll("span[style*='font-weight']");
      const recurso = norm(spans[0]?.textContent || "");
      const numeroExpediente = norm(spans[1]?.textContent || "");

      // Campos internos
      const pretensionDelito =
        getCampoEnFila(body, "Pretensión/Delito:") ||
        getCampoEnFila(body, "Pretensión / Delito");

      const tipoResolucion = getCampoEnFila(body, "Tipo Resolución:");
      const fechaResolucion = getCampoEnFila(body, "Fecha Resolución:");
      const salaSuprema = getCampoEnFila(body, "Sala Suprema:");
      const normaDerechoInterno = getCampoEnFila(body, "Norma de Derecho Interno:");
      const sumilla = getCampoEnFila(body, "Sumilla:");
      const palabrasClave = getCampoEnFila(body, "Palabras Clave:");

      // PDF directo (si el PJ lo muestra en el resultado)
      const linkResolucion = body.querySelector('a[href*="ServletDescarga"]');
      const hrefResolucion = linkResolucion?.getAttribute("href") || "";
      const urlResolucion = hrefResolucion
        ? (hrefResolucion.startsWith("http")
            ? hrefResolucion
            : window.location.origin + hrefResolucion)
        : "";

      // Link de detalle (ficha completa RichFaces)
      const linkDetalle =
        body.querySelector('a[href*="ficha"]') ||
        body.querySelector('a[href*="resultado"]') ||
        body.querySelector('a[href*="temporal"]') ||
        body.querySelector('a[href*="p_ficha"]');

      const hrefDetalle = linkDetalle?.getAttribute("href") || "";
      const detalleUrl = hrefDetalle
        ? (hrefDetalle.startsWith("http")
            ? hrefDetalle
            : window.location.origin + hrefDetalle)
        : "";

      // Push de la tarjeta parseada
      resoluciones.push({
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
        detalleUrl,
      });
    }

    debug.totalCards = resoluciones.length;

    return {
      ...debug,
      resoluciones,
    };
  });

  // --- DEBUG CONSOLA ---
  console.log("[JNS] Debug listado:", {
    foundPanel: payload.foundPanel,
    panelId: payload.panelId,
    totalRf: payload.totalRf,
    totalCards: payload.totalCards,
    sampleIds: payload.sampleIds,
  });

  // ❌ Si ni siquiera existe el panel → error real
  if (!payload.foundPanel) {
    throw new Error(
      `[JNS] scrapeListadoJNS: NO se encontró panel de resultados (panel=${payload.panelId})`
    );
  }

  // ⚠ Panel ok pero sin resultados
  if (!payload.totalRf || !payload.totalCards) {
    console.warn(
      "[JNS] scrapeListadoJNS: panel OK pero sin resultados. " +
        `rf-divs=${payload.totalRf}, cards=${payload.totalCards}, sampleIds=${JSON.stringify(
          payload.sampleIds || []
        )}`
    );
    return [];
  }

  // Resultado correcto
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

    // 👀 LOG: revisar qué viene del listado (solo primeros 5)
    console.log(
      "[JNS] Muestra de items del listado:",
      lista.slice(0, 5).map((it) => ({
        expediente: it.numeroExpediente,
        detalleUrl: it.detalleUrl,
        urlResolucion: it.urlResolucion,
      }))
    );

    if (!lista.length) {
      console.warn("[JNS] ⚠ No se encontraron resultados para esa query.");
      return 0;
    }

    // 6. Guardar en Mongo con mapeo coherente + ficha de detalle (Fase B)
    for (const item of lista) {
      console.log("[JNS] Procesando item:", {
        expediente: item.numeroExpediente,
        detalleUrl: item.detalleUrl,
        pdf: item.urlResolucion
      });

      try {
        const tituloCompuesto =
          normText(`${item.tipoResolucion || ""} ${item.recurso || ""}`) ||
          item.numeroExpediente;

        // Ficha "sintética" de respaldo
        let contenidoHTML = buildContenidoHtmlFromItem(item);
        let texto = "";
        let pdfUrl = item.urlResolucion || ""; // PDF detectado en el listado (si lo hubo)

        // Si tenemos URL de detalle, intentamos scrapear la ficha real (Fase B)
        if (item.detalleUrl) {
          const det = await scrapeDetalleJNS(browser, item.detalleUrl);
          if (det) {
            if (det.html) contenidoHTML = det.html;
            if (det.texto) texto = det.texto;
            if (det.pdfUrl) pdfUrl = det.pdfUrl;
          }
        }

        await saveOrUpdateJurisprudencia({
          titulo: tituloCompuesto,
          organo: item.salaSuprema,
          fechaResolucion: item.fechaResolucion,
          especialidad: "", // Se podría poblar en una Fase 2 si el PJ lo expone claramente
          numeroExpediente: item.numeroExpediente,
          sumilla: item.sumilla || item.pretensionDelito,

          // Fuente pública de la ficha
          fuenteUrl: item.detalleUrl || BASE_URL_RESULTADO,

          // 🔥 Aquí "poblamos" el PDF en la BD
          urlResolucion: pdfUrl,
          pdfUrl, // campo extra por si lo usas directamente en frontend

          // Contenido de ficha (real o sintético)
          contenidoHTML,
          texto,

          pretensionDelito: item.pretensionDelito,
          tipoResolucion: item.tipoResolucion,
          salaSuprema: item.salaSuprema,
          palabrasClave: item.palabrasClave,
          palabrasClaveRaw: item.palabrasClave,
          normaDerechoInterno: item.normaDerechoInterno,

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
