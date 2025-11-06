// backend/services/noticias.service.js
import Noticia from "../models/Noticia.js";
import chalk from "chalk";

/* ------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------ */
const norm = (s = "") =>
  s
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

const isHttp = (u = "") => /^https?:\/\//i.test(String(u || ""));
const toDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(+d) ? null : d;
};
const coalesce = (...vals) => vals.find((v) => v !== undefined && v !== null && String(v).trim() !== "");

/** Imagen preferente desde múltiples campos comunes */
const coalesceImage = (raw = {}) => {
  const cand = coalesce(
    raw.imagen,
    raw.image,
    raw.imageUrl,
    raw.urlToImage,
    raw.thumbnail,
    raw.thumbnailUrl,
    raw?.enclosure?.url,
    raw?.enclosure?.link,
    Array.isArray(raw.multimedia) && raw.multimedia[0]?.url,
    (Array.isArray(raw.media) && (raw.media[0]?.url || raw.media[0]?.src)) || null,
    Array.isArray(raw.images) && raw.images[0]?.url
  );
  return cand || "/assets/default-news.jpg";
};

/** Canoniza fuente a formas esperadas por el hook del modelo (fuenteNorm). */
function canonicalFuente(raw = "", enlace = "") {
  const base = norm(raw);
  const host = (() => {
    try {
      const h = new URL(String(enlace || "")).hostname || "";
      return h.replace(/^www\./i, "");
    } catch {
      return "";
    }
  })();

  let f = base || norm(host);
  if (!f) return "";

  if (f === "pj" || /poder\s*judicial/.test(f)) f = "poder judicial";
  if (f === "tc" || /tribunal\s*constitucional/.test(f)) f = "tribunal constitucional";
  if (/^gaceta juridica|gacetajuridica$/.test(f)) f = "gaceta juridica";
  if (f === "legis" || f === "legispe" || /legis\.?pe?/.test(f)) f = "legis.pe";
  if (/elperuano|diario oficial el peruano/.test(f)) f = "el peruano";
  if (/onu/.test(f) || /news\.un\.org/.test(host)) f = "onu noticias";
  if (/theguardian|guardian/.test(f)) f = "guardian";
  if (/nytimes|nyt/.test(f)) f = "nyt";
  if (/reuters/.test(f)) f = "reuters";
  if (/elpais|el\s*pais/.test(f)) f = "el pais";
  if (/ministerio publico|fiscalia/.test(f)) f = "ministerio publico";

  return f;
}

/* ------------------------------------------------------------
 * 🧠 Detección semántica automática de especialidad
 * (más tolerante y sin tildes)
 * ------------------------------------------------------------ */
export function inferirEspecialidad(noticia = {}) {
  const texto = norm(`${noticia.titulo || ""} ${noticia.resumen || ""} ${noticia.contenido || ""}`);

  const categorias = {
    penal: ["penal", "delito", "fiscalia", "mp", "ministerio publico"],
    civil: ["civil", "contrato", "propiedad", "obligaciones"],
    laboral: ["laboral", "trabajador", "sindicato", "sunafil"],
    constitucional: ["constitucional", "tribunal constitucional", "tc", "amparo"],
    familiar: ["familiar", "familia", "alimentos", "tenencia", "matrimonio"],
    administrativo: ["administrativo", "procedimiento administrativo", "resolucion directoral", "tupa"],
    ambiental: ["ambiental", "medio ambiente", "oefa", "eia"],
    registral: ["registral", "sunarp", "registro", "partida"],
    notarial: ["notarial", "notario"],
    tributario: ["tributario", "impuesto", "sunat", "igv", "renta"],
    procesal: ["procesal", "procedimiento", "proceso"],
    comercial: ["comercial", "mercantil", "societario", "empresa"],
    consumidor: ["consumidor", "indecopi"],
    penitenciario: ["penitenciario", "inpe", "prision"],
    "seguridad social": ["seguridad social", "previsional", "pension", "pensiones"],
  };

  for (const [key, values] of Object.entries(categorias)) {
    if (values.some((kw) => texto.includes(kw))) return key;
  }
  return "general";
}

/* ------------------------------------------------------------
 * Normalizador de entrada de noticia (input → doc del modelo)
 * ------------------------------------------------------------ */
function normalizeIncoming(n = {}) {
  const enlace = coalesce(n.enlace, n.url, n.link) || "";
  const titulo = coalesce(n.titulo, n.title, n.headline, "").toString().trim();
  const resumen = coalesce(n.resumen, n.descripcion, n.description, n.abstract, n.snippet, "") || "";
  const contenido = (n.contenido || n.content || n.body || "").toString();
  const imagen = coalesceImage(n);
  const imagenResuelta = n.imagenResuelta || n.imageResolved || ""; // si viene pre-resuelta
  const lang = norm(coalesce(n.lang, n.idioma, "es"));
  const temaRaw = n.tema || n.topics || n.tags || [];
  const tema = Array.isArray(temaRaw)
    ? temaRaw.map((t) => String(t || "").trim().toLowerCase()).filter(Boolean)
    : [];

  // fuente
  const fuente = coalesce(n.fuente, n.source?.name, n.source, "") || "";
  const fuenteCanon = canonicalFuente(fuente, enlace);

  // tipo
  const tipoDetectado = (() => {
    const f = fuenteCanon;
    const juridicos = new Set([
      "poder judicial",
      "tribunal constitucional",
      "sunarp",
      "gaceta juridica",
      "legis.pe",
      "corte idh",
      "cij",
      "tjue",
      "oea",
      "onu noticias",
      "el peruano",
      "ministerio publico",
    ]);
    if (juridicos.has(f)) return "juridica";
    const t = norm(n.tipo || "");
    return t === "juridica" || t === "juridicas" || t === "legal" ? "juridica" : "general";
  })();

  // especialidad (si no viene, inferir)
  const especialidad =
    norm(coalesce(n.especialidad, n.especialidadSlug, n.area, n.category, "")) || inferirEspecialidad(n);

  // fecha
  const fecha =
    toDate(coalesce(n.fecha, n.publishedAt, n.pubDate, n.date, n.createdAt, n.updatedAt)) || new Date();

  return {
    titulo,
    resumen,
    contenido,
    imagen,
    imagenResuelta,
    enlace,
    fuente: fuente || fuenteCanon || "Desconocida",
    tipo: tipoDetectado,
    especialidad,
    lang: lang || "es",
    tema,
    fecha,
  };
}

/* ------------------------------------------------------------
 * Construye $set sin clobber (no pisar con vacío)
 * ------------------------------------------------------------ */
function buildSafeSet(current = {}, next = {}) {
  const out = {};
  const keep = (k, v) => {
    if (v === undefined || v === null) return;
    if (typeof v === "string" && v.trim() === "") return;
    if (Array.isArray(v) && v.length === 0) return;
    out[k] = v;
  };

  // campos “mejorables”
  keep("titulo", next.titulo || current.titulo);
  keep("resumen", next.resumen || current.resumen);
  keep("contenido", next.contenido || current.contenido);
  keep("imagen", next.imagen || current.imagen);
  keep("imagenResuelta", next.imagenResuelta || current.imagenResuelta);
  keep("fuente", next.fuente || current.fuente);
  keep("tipo", next.tipo || current.tipo);
  keep("especialidad", next.especialidad || current.especialidad);
  keep("lang", next.lang || current.lang);
  keep("tema", next.tema && next.tema.length ? next.tema : current.tema);
  keep("fecha", next.fecha || current.fecha);

  out.updatedAt = new Date();
  return out;
}

/* ============================================================
 * 🧩 Inserta o actualiza noticias (modo upsert optimizado)
 * ============================================================ */
export async function upsertNoticias(noticias = []) {
  if (!Array.isArray(noticias) || noticias.length === 0) {
    console.log(chalk.yellow("⚠️ No se recibieron noticias para guardar."));
    return { inserted: 0, updated: 0, skipped: 0, total: 0 };
  }

  const ops = [];
  let skipped = 0;
  const enlacesVistos = new Set();

  for (const raw of noticias) {
    const n = normalizeIncoming(raw);
    const enlaceKey = (n.enlace || "").trim();

    // Requisitos mínimos
    if (!n.titulo || (!enlaceKey && !n.resumen)) {
      skipped++;
      continue;
    }

    // Evitar duplicado por enlace
    if (enlaceKey) {
      if (enlacesVistos.has(enlaceKey)) {
        skipped++;
        continue;
      }
      enlacesVistos.add(enlaceKey);
    }

    // Filtro de upsert:
    //  - Preferimos match por enlace (coincide con índice único parcial).
    //  - Si no hay enlace, usamos combinación de (titulo + fuente + día).
    const filter = enlaceKey
      ? { enlace: enlaceKey }
      : {
          titulo: n.titulo,
          fuente: n.fuente,
          fecha: {
            $gte: new Date(new Date(n.fecha).setHours(0, 0, 0, 0)),
            $lte: new Date(new Date(n.fecha).setHours(23, 59, 59, 999)),
          },
        };

    // Para evitar clobber, aprovechamos $set parcial: primero leemos doc actual en bulk? (no posible)
    // Estrategia: $set con datos “buenos” y dejamos el hook pre-validate hacer fuenteNorm, etc.
    ops.push({
      updateOne: {
        filter,
        update: {
          $setOnInsert: {
            createdAt: new Date(),
            enlace: enlaceKey, // respeta índice único parcial si viene
          },
          $set: {
            ...buildSafeSet({}, n),
          },
        },
        upsert: true,
      },
    });
  }

  if (ops.length === 0) {
    console.log(chalk.red("❌ No se generaron operaciones válidas de guardado."));
    return { inserted: 0, updated: 0, skipped, total: 0 };
  }

  try {
    const result = await Noticia.bulkWrite(ops, { ordered: false });
    const inserted = result.upsertedCount || 0;
    // Algunos drivers reportan modifiedCount; si no, calcúlalo
    const updated = result.modifiedCount ?? Math.max(0, (result.nUpserted || 0) + (result.nModified || 0) - inserted);
    const total = inserted + updated + skipped;

    console.log(
      chalk.green(`✅ Noticias procesadas: ${total} | Nuevas: ${inserted} | Actualizadas: ${updated} | Omitidas: ${skipped}`)
    );
    return { inserted, updated, skipped, total };
  } catch (err) {
    console.error(chalk.red("❌ Error en upsertNoticias:"), err?.message || err);
    return { inserted: 0, updated: 0, skipped: noticias.length, total: noticias.length };
  }
}

/* ============================================================
 * 📚 Obtiene noticias filtradas por tipo, especialidad y paginación
 *   (firma original preservada; se añaden args opcionales sin romper)
 * ============================================================ */
export async function getNoticias({
  tipo = "general",
  especialidad = "todas",
  page = 1,
  limit = 12,
  lang,           // opcional
  q,              // opcional (búsqueda simple)
  sinceDays,      // opcional (número)
} = {}) {
  const query = {};

  // --- Filtros por tipo (compat)
  if (tipo) {
    const t = norm(tipo);
    if (t === "general") {
      query.$or = [{ tipo: "general" }, { tipo: { $exists: false } }, { tipo: "" }];
    } else if (t === "juridica" || t === "juridicas" || t === "legal") {
      query.tipo = "juridica";
    }
  }

  // --- Filtro por especialidad (exacta o heurística)
  const esc = norm(especialidad);
  if (esc && esc !== "todas") {
    const tokens = [esc]
      .concat({
        procesal: ["proceso", "procedimiento"],
        "seguridad social": ["previsional", "pension", "pensiones"],
        constitucional: ["tc", "tribunal constitucional"],
        registral: ["sunarp", "registro", "partida"],
        penal: ["delito", "fiscalia", "mp", "ministerio publico"],
        civil: ["contrato", "propiedad", "obligaciones"],
        laboral: ["trabajador", "sindicato", "sunafil"],
        administrativo: ["tupa", "procedimiento administrativo", "resolucion"],
      }[esc] || [])
      .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|");

    const rx = new RegExp(`\\b(${tokens})\\b`, "i");
    query.$and = (query.$and || []).concat([
      {
        $or: [
          { especialidad: { $regex: rx } },
          { titulo: { $regex: rx } },
          { resumen: { $regex: rx } },
          { contenido: { $regex: rx } },
          { fuente: { $regex: rx } },
        ],
      },
    ]);
  }

  // --- Idioma
  if (lang && norm(lang) !== "all") {
    const rxLang = new RegExp(`^${norm(lang)}`, "i");
    query.$and = (query.$and || []).concat([{ $or: [{ lang: { $regex: rxLang } }, { lang: { $exists: false } }, { lang: "" }] }]);
  }

  // --- sinceDays
  if (sinceDays && Number(sinceDays) > 0) {
    const since = new Date(Date.now() - Number(sinceDays) * 86400000);
    query.$and = (query.$and || []).concat([{ fecha: { $gte: since } }]);
  }

  // --- Búsqueda simple (q)
  if (q && String(q).trim()) {
    const toks = String(q)
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
    if (toks.length) {
      query.$and = (query.$and || []).concat([
        {
          $or: toks
            .map((rx) => [{ titulo: rx }, { resumen: rx }, { contenido: rx }, { fuente: rx }])
            .flat(),
        },
      ]);
    }
  }

  const skip = (Number(page) - 1) * Number(limit);

  try {
    const projection = {
      titulo: 1,
      resumen: 1,
      contenido: 1,
      fuente: 1,
      enlace: 1,
      imagen: 1,
      imagenResuelta: 1,
      tipo: 1,
      especialidad: 1,
      fecha: 1,
      lang: 1,
      tema: 1,
    };

    const [docs, total] = await Promise.all([
      Noticia.find(query).sort({ fecha: -1, _id: -1 }).skip(skip).limit(Number(limit)).select(projection).lean(),
      Noticia.countDocuments(query),
    ]);

    const normalizadas = (docs || []).map((n, i) => ({
      id: n._id?.toString?.() || `noticia-${i}`,
      titulo: n.titulo || "Sin título",
      resumen: n.resumen || "Sin resumen disponible.",
      contenido: n.contenido || "",
      imagen: n.imagen || "/assets/default-news.jpg",
      imagenResuelta: n.imagenResuelta || "",
      enlace: n.enlace || "",
      fuente: n.fuente || "Fuente desconocida",
      tipo: n.tipo || "general",
      especialidad: n.especialidad || "general",
      fecha: n.fecha || new Date(),
      lang: n.lang || "es",
      tema: Array.isArray(n.tema) ? n.tema : [],
    }));

    console.log(
      chalk.cyan(
        `📰 ${normalizadas.length} noticias obtenidas (${tipo || "todas"} | ${especialidad || "todas"}) page=${page}`
      )
    );

    return {
      ok: true,
      tipo,
      especialidad,
      total,
      hasMore: skip + Number(limit) < total,
      items: normalizadas,
    };
  } catch (err) {
    console.error(chalk.red("❌ Error al obtener noticias:"), err?.message || err);
    return {
      ok: false,
      tipo,
      especialidad,
      total: 0,
      hasMore: false,
      items: [],
      error: err?.message || "Error desconocido",
    };
  }
}

/* ============================================================
 * 🧽 Elimina duplicados por URL (enlace) y, si no hay enlace,
 *     por (titulo+fuente+misma fecha-calendario)
 * ============================================================ */
export async function limpiarDuplicados() {
  console.log(chalk.gray("🧹 Buscando duplicados en colección de noticias..."));

  // 1) Duplicados por enlace
  const dupEnlace = await Noticia.aggregate([
    { $match: { enlace: { $type: "string", $exists: true, $ne: "" } } },
    { $group: { _id: "$enlace", ids: { $addToSet: "$_id" }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]);

  let eliminadas = 0;
  for (const d of dupEnlace) {
    d.ids.shift(); // conserva el primero
    if (d.ids.length) {
      eliminadas += d.ids.length;
      await Noticia.deleteMany({ _id: { $in: d.ids } });
    }
  }

  // 2) Duplicados por (titulo+fuente+misma fecha-día) cuando no hay enlace
  const dupTituloFuente = await Noticia.aggregate([
    { $match: { $or: [{ enlace: { $exists: false } }, { enlace: "" }] } },
    {
      $group: {
        _id: {
          titulo: "$titulo",
          fuente: "$fuente",
          y: { $year: "$fecha" },
          m: { $month: "$fecha" },
          d: { $dayOfMonth: "$fecha" },
        },
        ids: { $addToSet: "$_id" },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);

  for (const d of dupTituloFuente) {
    d.ids.shift();
    if (d.ids.length) {
      eliminadas += d.ids.length;
      await Noticia.deleteMany({ _id: { $in: d.ids } });
    }
  }

  console.log(chalk.green(`🧽 Duplicados eliminados: ${eliminadas}`));
  return eliminadas;
}
