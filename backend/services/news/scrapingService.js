// ============================================================
// 🦉 BÚHOLEX | Servicio de orquestación de scraping (refactor)
// - Reutiliza el agregador ÚNICO (collectFromProviders)
// - Logging + métricas
// - (Opcional) Persistencia en Mongo con upsert normalizado
// ============================================================

import chalk from "chalk";
import { collectFromProviders, REGISTRY, DEFAULT_JURIDICAS, DEFAULT_GENERALES } from "../newsProviders/index.js";
import { normalizeNoticia } from "../newsProviders/normalizer.js";
import Noticia from "../../models/Noticia.js";

/**
 * Ejecuta scraping usando el agregador central y devuelve items ya ordenados.
 * @param {Object} opts
 * @param {string[]} [opts.providers]  Claves del REGISTRY; si omites, usa defaults por tipo
 * @param {number}   [opts.maxPerProvider]  (compat) → traducido a limit por página
 * @param {'juridica'|'general'} [opts.tipo]  default 'juridica'
 * @param {string}   [opts.lang]  default 'es'
 * @param {string}   [opts.q]     filtro textual (opcional)
 * @param {boolean}  [opts.completos] exigir artículos largos (heurística)
 * @param {boolean}  [opts.debug] habilita logs verbosos
 */
export async function obtenerNoticiasDeFuentes({
  providers = [],
  maxPerProvider = 12,
  tipo = "juridica",
  lang = "es",
  q = "",
  completos = false,
  debug = process.env.NEWS_DEBUG === "1",
} = {}) {
  const wanted = Array.isArray(providers) && providers.length
    ? providers.filter((k) => !!REGISTRY[k])
    : (tipo === "general" ? DEFAULT_GENERALES : DEFAULT_JURIDICAS);

  if (debug) {
    console.log(chalk.gray("• Providers activos:"), wanted.join(", "));
  } else {
    console.log(chalk.blue(`🧠 Scraping agregado (${tipo})…`));
  }

  // Reutilizamos el agregador único
  const { items, pagination, filtros } = await collectFromProviders({
    tipo,
    providers: wanted,
    q,
    lang,
    completos,
    limit: maxPerProvider, // compat: usamos como "page size"
    page: 1,
  });

  // Métricas simples
  const totJ = items.filter((n) => n.tipo === "juridica").length;
  const totG = items.length - totJ;

  console.log(chalk.cyan("\n------------------------------------------"));
  console.log(chalk.cyan("📊 Totales consolidados (memoria)"));
  console.log(chalk.cyan("------------------------------------------"));
  console.log(chalk.cyan(`⚖️  Jurídicas: ${totJ}`));
  console.log(chalk.cyan(`🌐 Generales:  ${totG}`));
  console.log(chalk.cyan("------------------------------------------\n"));

  return { ok: true, items, pagination, filtros };
}

/**
 * Variante para CRON: obtiene y **persiste** en Mongo evitando duplicados.
 * Devuelve conteos de upserts.
 */
export async function scrapearYGuardar({
  providers = [],
  tipo = "juridica",
  lang = "es",
  q = "",
  completos = false,
  maxPerProvider = 20,
  debug = process.env.NEWS_DEBUG === "1",
} = {}) {
  const res = await obtenerNoticiasDeFuentes({
    providers,
    tipo,
    lang,
    q,
    completos,
    maxPerProvider,
    debug,
  });

  let guardadas = 0;
  for (const raw of res.items) {
    try {
      const n = normalizeNoticia(raw); // garantiza campos coherentes
      // Usamos "enlace" como key estable
      await Noticia.updateOne(
        { enlace: n.enlace },
        { $setOnInsert: n },
        { upsert: true }
      );
      guardadas++;
    } catch (err) {
      console.error(chalk.red(`❌ Error guardando: ${raw?.titulo || raw?.url}`), err?.message);
    }
  }

  return {
    ...res,
    persisted: guardadas,
  };
}
