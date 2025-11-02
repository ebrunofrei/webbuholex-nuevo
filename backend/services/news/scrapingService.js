// backend/services/news/scrapingService.js
// ============================================================
// 🦉 BÚHOLEX | Servicio principal de scraping de noticias (refactor)
// - ejecución en paralelo con límite de concurrencia
// - selección opcional de providers
// - normalización + deduplicación
// - tipificación (jurídica / general) por proveedor
// - métricas de salida
// ============================================================

import chalk from "chalk";
import { normalizeNoticias } from "../newsProviders/normalizer.js";
import * as Providers from "../newsProviders/index.js";

/* ------------------------------- config ------------------------------- */

// Mapa { idProvider: { nombre, fn } } desde lo exportado en index.js
const REGISTRY = Object.fromEntries(
  Object.entries(Providers).map(([exportName, fn]) => {
    // nombre legible (capitalize espacios por mayúsculas dentro)
    const nombre = exportName
      .replace(/^fetch/i, "")
      .replace(/([A-Z])/g, " $1")
      .trim();

    return [idFromExport(exportName), { nombre, fn }];
  })
);

// Proveedores que consideraremos jurídicos (para etiquetar tipo)
const JURIDICOS = new Set([
  "poderjudicial",
  "tc",
  "sunarp",
  "jnj",
  "gacetajuridica",
  "legispe",
  "corteidh",
  "cij",
  "tjue",
  "oea",
  "onunoticias",
]);

// límite de concurrencia simple (sin deps externas)
const CONCURRENCY = 5;

/* ------------------------------ helpers ------------------------------- */

function idFromExport(exportName = "") {
  // fetchPoderJudicial -> poderjudicial
  return exportName
    .replace(/^fetch/i, "")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, "");
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function dedupeByUrl(items = []) {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const k = (it.url || it.enlace || "").trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}

/* ------------------------------- main -------------------------------- */

export async function obtenerNoticiasDeFuentes({
  // si pasas providers: ["poderjudicial","tc",...]
  providers = [],
  maxPerProvider = 12,
  debug = process.env.NEWS_DEBUG === "1",
} = {}) {
  const ids = providers.length
    ? providers.filter((p) => REGISTRY[p])
    : Object.keys(REGISTRY);

  if (debug) {
    console.log(chalk.gray("• Providers activos:"), ids.join(", "));
  } else {
    console.log(chalk.blue("🧠 Iniciando scraping global de fuentes..."));
  }

  const tareas = ids.map((id) => ({ id, ...REGISTRY[id] }));

  const resultados = [];
  const errores = [];

  // Ejecutamos por lotes para limitar concurrencia
  for (const lote of chunk(tareas, CONCURRENCY)) {
    const settled = await Promise.allSettled(
      lote.map(async ({ id, nombre, fn }) => {
        console.log(chalk.yellow(`\n📰 Extrayendo desde: ${nombre} ...`));
        const data = await fn({ max: maxPerProvider });
        const arr = Array.isArray(data) ? data : [];

        if (arr.length) {
          console.log(
            chalk.green(`✅ ${nombre} devolvió ${arr.length} resultados.`)
          );
          resultados.push(
            ...arr.map((n) => ({
              ...n,
              // etiqueta tipo por proveedor si no vino seteado
              tipo: n.tipo || (JURIDICOS.has(id) ? "juridica" : "general"),
              // rellena fuente si faltó
              fuente: n.fuente || nombre,
              _provider: id,
            }))
          );
        } else {
          console.log(chalk.red(`⚠️ ${nombre} no devolvió resultados.`));
        }
      })
    );

    // recolecta errores del lote
    settled.forEach((r, i) => {
      if (r.status === "rejected") {
        const { id, nombre } = lote[i];
        const msg = r.reason?.message || String(r.reason);
        console.error(chalk.red(`❌ Error en ${nombre}: ${msg}`));
        errores.push({ id, nombre, error: msg });
      }
    });
  }

  // Normaliza, deduplica y ordena (multimedia desc + fecha desc)
  const normalizadas = normalizeNoticias(resultados);
  const unicas = dedupeByUrl(normalizadas).sort((a, b) => {
    const msA = a.video ? 2 : a.imagen ? 1 : 0;
    const msB = b.video ? 2 : b.imagen ? 1 : 0;
    if (msB !== msA) return msB - msA;
    return new Date(b.fecha || 0) - new Date(a.fecha || 0);
  });

  const totJ = unicas.filter((n) => n.tipo === "juridica").length;
  const totG = unicas.filter((n) => n.tipo !== "juridica").length;

  console.log(chalk.cyan("\n------------------------------------------"));
  console.log(chalk.cyan("📊 Totales consolidados"));
  console.log(chalk.cyan("------------------------------------------"));
  console.log(chalk.cyan(`⚖️  Jurídicas: ${totJ}`));
  console.log(chalk.cyan(`🌐 Generales / Ciencia / Tecnología: ${totG}`));
  if (errores.length) {
    console.log(chalk.cyan(`⚠️  Con errores en ${errores.length} proveedor(es).`));
  }
  console.log(chalk.cyan("------------------------------------------\n"));

  return {
    ok: true,
    items: unicas,
    stats: {
      total: unicas.length,
      juridicas: totJ,
      generales: totG,
      providersEjecutados: ids,
      errores,
    },
  };
}
