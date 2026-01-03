// backend/jobs/cronJurisprudencia.js
// ============================================================
// 🦉 BúhoLex | Cron de Jurisprudencia (PJ + TC)
// - Cada X horas consulta palabras clave en PJ/TC
// - Guarda nuevas resoluciones en Mongo (sin duplicar)
// - Deja embedding = null para que luego las procese el seeder
// ============================================================

import cron from "node-cron";
import chalk from "chalk";
import Jurisprudencia from "../models/Jurisprudencia.js";
import { scrapePJ } from "../scrapers/poderJudicial.js";
import { scrapeTC } from "../scrapers/tc.js";
import { normalizeJurisprudencia } from "../services/jurisprudenciaNormalizer.js";

// Palabras clave iniciales (puedes ajustar/expandir)
const KEYWORDS = [
  "desalojo",
  "filiación matrimonial",
  "amparo",
  "nulidad de acto jurídico",
];

// Máximo de resoluciones nuevas por ciclo y por fuente
const MAX_PER_SOURCE = 10;

/**
 * Guarda documentos evitando duplicados por (fuente + titulo + fechaResolucion)
 */
async function persistMany(items, fuente) {
  let inserted = 0;

  for (const raw of items) {
    if (inserted >= MAX_PER_SOURCE) break;

    // 1️⃣ Mapear datos crudos → estructura base
    const mapped = {
      titulo: raw.titulo || raw.title || "",
      numero: raw.numero || "",
      materia: raw.materia || "",
      organo: raw.organo || "",
      fechaResolucion: raw.fecha || null,
      estado: raw.estado || "Vigente",
      sumilla: raw.sumilla || "",
      resumen: raw.resumen || "",
      texto: raw.texto || "",
      fuente, // "PJ" | "TC"
      enlaceOficial: raw.pdfLink || raw.link || "",
      pdfPath: raw.pdfPath || "",
      embedding: null, // se completa luego con embed-jurisprudencia.js
      tags: raw.tags || [],
      creadoPor: "cronJurisprudencia",
    };

    // 2️⃣ Canonizar SIEMPRE antes de cualquier operación
    const { normalized } = normalizeJurisprudencia(mapped);

    const { titulo, fuente: fuenteCanon, fechaResolucion } = normalized;

    // Regla mínima de existencia
    if (!titulo) continue;

    // 3️⃣ Check de duplicado usando valores CANÓNICOS
    const exists = await Jurisprudencia.findOne({
      titulo,
      fuente: fuenteCanon,
      ...(fechaResolucion ? { fechaResolucion } : {}),
    }).lean();

    if (exists) continue;

    // 4️⃣ Persistencia final (solo canon entra a Mongo)
    await Jurisprudencia.create(normalized);
    inserted += 1;
  }

  return inserted;
}

/**
 * Ejecuta una pasada completa: todas las keywords, PJ + TC.
 */
async function runOnce() {
  const enabled = String(process.env.ENABLE_JURIS_CRON || "").toLowerCase() === "true";
  if (!enabled) {
    console.log(chalk.gray("[JurisCron] Saltado porque ENABLE_JURIS_CRON != true"));
    return;
  }

  console.log(chalk.cyan("\n[JurisCron] Iniciando actualización automática de jurisprudencia...\n"));

  let totalPJ = 0;
  let totalTC = 0;

  for (const q of KEYWORDS) {
    try {
      console.log(chalk.yellow(`[JurisCron] Buscando en PJ: "${q}"...`));
      const pjResults = await scrapePJ(q);
      const pjInserted = await persistMany(pjResults, "PJ");
      totalPJ += pjInserted;
      console.log(
        chalk.green(`[JurisCron] PJ "${q}": ${pjInserted} nuevas resoluciones guardadas.`)
      );
    } catch (err) {
      console.error(chalk.red("[JurisCron] Error en PJ:"), err.message);
    }

    try {
      console.log(chalk.yellow(`[JurisCron] Buscando en TC: "${q}"...`));
      const tcResults = await scrapeTC(q);
      const tcInserted = await persistMany(tcResults, "TC");
      totalTC += tcInserted;
      console.log(
        chalk.green(`[JurisCron] TC "${q}": ${tcInserted} nuevas resoluciones guardadas.`)
      );
    } catch (err) {
      console.error(chalk.red("[JurisCron] Error en TC:"), err.message);
    }
  }

  console.log(
    chalk.magenta(
      `\n[JurisCron] Ciclo terminado. Nuevas resoluciones -> PJ: ${totalPJ}, TC: ${totalTC}\n`
    )
  );
}

/**
 * Arranca el cron: cada 6 horas + una pasada inicial al levantar el servidor.
 */
export function startCronJurisprudencia() {
  const enabled = String(process.env.ENABLE_JURIS_CRON || "").toLowerCase() === "true";

  if (!enabled) {
    console.log(chalk.gray("[JurisCron] Deshabilitado (ENABLE_JURIS_CRON != true)."));
    return;
  }

  // Ejecuta una vez al arranque (no bloqueante)
  runOnce().catch((err) =>
    console.error(chalk.red("[JurisCron] Error en runOnce inicial:"), err)
  );

  // Programa para cada 6 horas, minuto 7 (por ejemplo)
  cron.schedule("7 */6 * * *", () => {
    runOnce().catch((err) =>
      console.error(chalk.red("[JurisCron] Error en ciclo programado:"), err)
    );
  });

  console.log(chalk.green("[JurisCron] Programado cada 6 horas (*/6)."));
}
