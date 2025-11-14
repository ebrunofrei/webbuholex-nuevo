// backend/services/jurisEmbeddingsService.js
// ============================================================
// 🦉 BúhoLex | Embeddings de Jurisprudencia (Mongo + OpenAI)
// - embedText: genera embedding de un texto suelto (para búsquedas)
// - embedAllJurisprudencia: recorre resoluciones y guarda vector
// - Pensado para usar con text-embedding-3-small (barato y bueno)
// ============================================================

import OpenAI from "openai";
import chalk from "chalk";
import mongoose from "mongoose";

import { dbConnect, dbDisconnect } from "./db.js";
import Jurisprudencia from "../models/Jurisprudencia.js";

/* ------------------------------------------
 * Configuración OpenAI
 * ------------------------------------------ */
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
if (!OPENAI_API_KEY) {
  console.warn(
    chalk.yellow(
      "[JurisEmbeddings] WARNING: OPENAI_API_KEY no definido. Los embeddings no funcionarán."
    )
  );
}

const EMBEDDING_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";

const client = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

/* ------------------------------------------
 * Helpers
 * ------------------------------------------ */

function cleanText(texto = "") {
  return String(texto).replace(/\s+/g, " ").trim();
}

/**
 * Llama a OpenAI y devuelve el vector de embedding.
 * Exportado para que lo use:
 *  - /routes/jurisprudenciaEmbed.js (búsqueda por similitud)
 *  - scripts / herramientas que necesiten embeddings sueltos.
 */
export async function embedText(
  texto,
  { model = EMBEDDING_MODEL, signal } = {}
) {
  const content = cleanText(texto);
  if (!content) return [];

  if (!OPENAI_API_KEY) {
    throw new Error("[JurisEmbeddings] Falta OPENAI_API_KEY.");
  }

  const res = await client.embeddings.create({
    model,
    input: content,
    signal,
  });

  const embedding = res.data?.[0]?.embedding || [];
  if (!embedding.length) {
    throw new Error("[JurisEmbeddings] OpenAI devolvió embedding vacío.");
  }
  return embedding;
}

/* ------------------------------------------
 * Seed masivo de jurisprudencia
 * ------------------------------------------ */

/**
 * Genera/actualiza embeddings para resoluciones internas.
 * options:
 *  - limit: cuántas resoluciones como máximo procesar
 *  - dryRun: si true, no guarda cambios (solo “simula”)
 */
export async function embedAllJurisprudencia(options = {}) {
  const { limit = 100, dryRun = false } = options;

  console.log(
    chalk.cyan(
      `\n[JurisEmbeddings] Generando embeddings (modelo: ${EMBEDDING_MODEL})...`
    )
  );

  await dbConnect();

  // Selecciona resoluciones que no tengan embedding o que lo tengan vacío
  const query = {
    $or: [
      { embedding: { $exists: false } },
      { embedding: { $size: 0 } },
      { embedding: null },
    ],
  };

  const docs = await Jurisprudencia.find(query)
    .sort({ updatedAt: 1 }) // las más antiguas primero
    .limit(limit)
    .lean();

  if (!docs.length) {
    console.log(
      chalk.gray("[JurisEmbeddings] No hay resoluciones pendientes de embedding.")
    );
    await dbDisconnect();
    return 0;
  }

  console.log(
    chalk.gray(
      `[JurisEmbeddings] Encontradas ${docs.length} resoluciones para procesar.`
    )
  );

  let processed = 0;

  for (const j of docs) {
    const baseTexto = cleanText(
      [
        j.titulo,
        j.sumilla,
        j.resumen,
        j.numero,
        j.materia,
        j.organo,
        j.estado,
      ]
        .filter(Boolean)
        .join(". ")
    );

    if (!baseTexto) {
      // No tiene texto útil; marcamos embedding vacío para no reprocesar eternamente
      if (!dryRun) {
        await Jurisprudencia.updateOne(
          { _id: j._id },
          {
            $set: {
              embedding: [],
              embeddingModel: EMBEDDING_MODEL,
              embeddingUpdatedAt: new Date(),
            },
          }
        );
      }
      continue;
    }

    let vec;
    try {
      vec = await embedText(baseTexto, { model: EMBEDDING_MODEL });
    } catch (err) {
      console.error(
        chalk.red(
          `[JurisEmbeddings] Error al generar embedding para ${j._id}:`,
          err.message
        )
      );
      continue;
    }

    if (!dryRun) {
      await Jurisprudencia.updateOne(
        { _id: j._id },
        {
          $set: {
            embedding: vec,
            embeddingModel: EMBEDDING_MODEL,
            embeddingUpdatedAt: new Date(),
          },
        }
      );
    }

    processed += 1;
  }

  console.log(
    chalk.green(
      `[JurisEmbeddings] Embeddings generados/actualizados para ${processed} resoluciones.\n`
    )
  );

  await dbDisconnect();
  return processed;
}

/* ------------------------------------------
 * Búsqueda por embedding (placeholder)
 * ------------------------------------------ */

/**
 * Búsqueda aproximada por embedding.
 * NOTA: ahora mismo esta función solo es un “TODO”.
 * Tu ruta /api/jurisprudencia/search-embed está usando embedText + lógica propia.
 * Cuando quieras mover toda la lógica aquí, la implementamos.
 */
export async function searchJurisprudenciaByEmbedding(_texto, _options = {}) {
  throw new Error(
    "[JurisEmbeddings] searchJurisprudenciaByEmbedding aún no está implementado."
  );
}
