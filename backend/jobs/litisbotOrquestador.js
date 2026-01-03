// backend/jobs/litisbotOrquestador.js
// ============================================================
// 🧠 LitisBot – Orquestador de FUENTES LEGALES (MongoDB)
//  - Consume scrapers (boletines, jurisprudencia, normas, doctrina…)
//  - Pasa cada ítem por litisbotAI.analizarContenidoLegal()
//  - Guarda en MongoDB (colección fuentes_legales)
//  - Opcional: envía notificaciones inteligentes
// ============================================================

import chalk from "chalk";
import FuenteLegal from "#models/FuenteLegal.js";

// IMPORTA AQUÍ TUS SCRAPERS REALES
// (por ahora asumo que al menos existe fetchBoletinesIDH)
import { fetchBoletinesIDH } from "#services/scrapingBoletines.js";

import { analizarContenidoLegal } from "#services/litisbotAI.js";
import { enviarNotificacionesInteligentes } from "#services/litisbotNotificaciones.js";

/* ============================================================
   1. Configuración de fuentes (puedes ir sumando más)
============================================================ */

const FUENTES = [
  {
    id: "idh_boletines",
    descripcion: "Boletines Corte IDH",
    tipo: "noticia",
    fetchFn: fetchBoletinesIDH,
    notificar: true,
  },
  // Ejemplo para cuando crees más scrapers:
  // {
  //   id: "pj_jurisprudencia",
  //   descripcion: "Jurisprudencia del Poder Judicial",
  //   tipo: "jurisprudencia",
  //   fetchFn: fetchJurisprudenciaPJ,
  //   notificar: false,
  // },
];

/* ============================================================
   2. Helpers: hash lógico para evitar duplicados
============================================================ */

import crypto from "crypto";

function buildHashId(item, fuenteConfig) {
  const base = `${fuenteConfig.id}::${item.titulo || ""}::${
    item.numeroExpediente || ""
  }::${item.url || ""}`;
  return crypto.createHash("sha256").update(base).digest("hex");
}

/* ============================================================
   3. Guardar en Mongo (upsert por hashId)
============================================================ */

async function upsertFuenteLegal(baseItem, analisisIA = {}) {
  const ahora = new Date();

  const doc = await FuenteLegal.findOneAndUpdate(
    { hashId: baseItem.hashId },
    {
      ...baseItem,
      ...analisisIA,
      actualizadoEn: ahora,
      $setOnInsert: {
        fechaRegistro: ahora,
      },
    },
    {
      new: true,
      upsert: true,
    }
  );

  return doc;
}

/* ============================================================
   4. Procesar una fuente
============================================================ */

async function procesarItemFuente(fuenteConfig, rawItem) {
  if (!rawItem || !rawItem.titulo) return null;

  // Normalizar estructura mínima
  const baseItem = {
    tipo: fuenteConfig.tipo,
    fuenteId: fuenteConfig.id,
    fuente: rawItem.fuente || fuenteConfig.descripcion,
    titulo: rawItem.titulo || "(Sin título)",
    resumen: rawItem.resumen || rawItem.extracto || "",
    url: rawItem.url || null,
    fecha: rawItem.fecha || new Date().toISOString().substring(0, 10),

    numeroExpediente: rawItem.numeroExpediente || null,
    organo: rawItem.organo || null,
    sala: rawItem.sala || null,
    materia: rawItem.materia || null,
    jurisdiccion: rawItem.jurisdiccion || null,
    pais: rawItem.pais || "Perú",

    numeroNorma: rawItem.numeroNorma || null,
    tipoNorma: rawItem.tipoNorma || null,

    creadoPor: `LitisBotOrquestador:${fuenteConfig.id}`,
  };

  // hashId para evitar duplicar la misma fuente
  baseItem.hashId = buildHashId(baseItem, fuenteConfig);

  // Análisis IA (clasificación + resumen IA)
  const analisisIA = await analizarContenidoLegal(baseItem);

  // Guardar en Mongo (upsert)
  const doc = await upsertFuenteLegal(baseItem, analisisIA);

  // Notificaciones si procede
  if (fuenteConfig.notificar && analisisIA?.resumenIA) {
    try {
      await enviarNotificacionesInteligentes({
        titulo: analisisIA.tituloSugerido || baseItem.titulo,
        mensaje: analisisIA.resumenIA,
        url: baseItem.url,
        tipoFuente: baseItem.tipo,
        destinatarios: analisisIA.sugeridos || [],
      });
    } catch (err) {
      console.error(
        chalk.yellow(
          `⚠️ Error enviando notificación para fuente ${doc._id}: ${err.message}`
        )
      );
    }
  }

  console.log(
    chalk.green(
      `✔️ Guardada/actualizada fuente [${doc._id}] ${baseItem.titulo.slice(
        0,
        90
      )}`
    )
  );

  return doc;
}

/* ============================================================
   5. Orquestador global
============================================================ */

export async function rutinaLitisBotOrquestador() {
  console.log(chalk.cyan("\n▶️ Iniciando rutinaLitisBotOrquestador (Mongo)…"));

  for (const fuente of FUENTES) {
    console.log(
      chalk.cyan(
        `\n🔎 Fuente: ${fuente.descripcion} (id=${fuente.id}, tipo=${fuente.tipo})`
      )
    );

    let items = [];
    try {
      items = await fuente.fetchFn();
      console.log(
        chalk.cyan(`   📥 Elementos obtenidos de scraper: ${items.length}`)
      );
    } catch (err) {
      console.error(
        chalk.red(
          `❌ Error en fetch de ${fuente.id} (${fuente.descripcion}): ${err.message}`
        )
      );
      continue;
    }

    for (const item of items) {
      try {
        await procesarItemFuente(fuente, item);
      } catch (err) {
        console.error(
          chalk.yellow(
            `   ⚠️ Error procesando elemento "${item?.titulo}": ${err.message}`
          )
        );
      }
    }
  }

  console.log(chalk.green("\n✅ rutinaLitisBotOrquestador finalizada.\n"));
}

// Permite ejecutar el job directamente: node backend/jobs/litisbotOrquestador.js
if (import.meta.url === `file://${process.argv[1]}`) {
  rutinaLitisBotOrquestador().catch((err) => {
    console.error(chalk.red("❌ Error fatal en rutinaLitisBotOrquestador:"), err);
    process.exit(1);
  });
}
