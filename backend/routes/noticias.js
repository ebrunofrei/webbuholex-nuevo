// backend/routes/noticias.js
// ============================================================
// 🦉 BÚHOLEX | Rutas de Noticias (MongoDB)
//   GET /api/noticias
//   GET /api/noticias/especialidades
//   GET /api/noticias/temas
// - Salida: { ok, items, pagination, filtros }
// - Filtros: tipo, especialidad(+sinón.), q|tema, lang, providers, since|sinceDays, completos
// - Paginación segura (page, limit 1..50) y orden robusto + fallbacks
// ============================================================
import { Router } from "express";
import Noticia from "../models/Noticia.js";

const router = Router();

/* ------------------------- Utils base ------------------------- */
const clamp = (n, lo, hi) => Math.min(Math.max(Number(n) || 0, lo), hi);
const toInt = (v, d) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : d;
};
const norm = (s = "") =>
  s?.toString().trim().toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "") || "";

const escapeRx = (s = "") => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const safeRegex = (pattern, flags = "") => {
  try { return new RegExp(pattern, flags); }
  catch { return new RegExp("a^"); } // nunca matchea
};

/* ------------------- Sinónimos de especialidad ------------------- */
const ESPECIALIDAD_EQ = {
  procesal: ["proceso", "procedimiento"],
  "seguridad social": ["previsional", "pensiones", "pension"],
  constitucional: ["tc", "tribunal constitucional"],
  notarial: ["notario"],
  registral: ["sunarp", "registro", "registrador", "partida"],
  penal: ["delito", "fiscal", "mp", "ministerio publico"],
  civil: ["contrato", "propiedad", "obligaciones"],
  laboral: ["trabajo", "trabajador", "sindicato", "sindical", "sunafil"],
  administrativo: ["resolucion", "expediente", "tupa", "procedimiento administrativo"],
  comercial: ["societario", "empresa", "mercantil"],
  tributario: ["igv", "renta", "sunat", "tributo", "impuesto"],
  ambiental: ["oefa", "impacto ambiental", "eia"],
  consumidor: ["indecopi", "proteccion al consumidor"],
  penitenciario: ["inpe", "prision", "penitenciario"],
};

/* -------------------- Defaults JUR (proveedores) ------------------- */
// Formas CANÓNICAS (coinciden con fuenteNorm del modelo)
const DEFAULT_PROVIDERS_JUR = [
  "poder judicial",
  "tribunal constitucional",
  "sunarp",
  "el peruano",
  "gaceta juridica",
  "legis.pe",
  "corte idh",
  "cij",
  "tjue",
  "oea",
  "onu noticias",
  "ministerio publico",
];

/* --------- Clausula flexible de especialidad (con fallback) --------- */
function buildEspecialidadClause(valor) {
  const key = norm(valor);
  if (!key || key === "todas") return null;

  const tokens = [key, ...(ESPECIALIDAD_EQ[key] || [])]
    .map(escapeRx)
    .join("|");

  const rx = safeRegex(`\\b(${tokens})\\b`, "i");
  return {
    $or: [
      { especialidad: { $regex: rx } },
      { area: { $regex: rx } },
      { categoria: { $regex: rx } },
      { titulo: { $regex: rx } },
      { resumen: { $regex: rx } },
      { contenido: { $regex: rx } },
      { fuente: { $regex: rx } },
    ],
  };
}

/* ------------------- Normalizador de providers ------------------- */
// Devuelve formas canónicas equivalentes a fuenteNorm del modelo
function parseProviders(input) {
  if (!input) return [];
  const arr = Array.isArray(input) ? input : String(input).split(",");

  const normProv = (raw = "") => {
    let s = norm(raw)
      .replace(/^https?:\/\/(www\.)?/, "")
      .replace(/\.(pe|com|org|net|es)$/g, "")
      .replace(/noticias$/i, "")
      .trim();

    if (!s) return "";
    if (s === "pj" || /poder\s*judicial/.test(s)) return "poder judicial";
    if (s === "tc" || /tribunal\s*constitucional/.test(s)) return "tribunal constitucional";
    if (/^gaceta juridica|gacetajuridica$/.test(s)) return "gaceta juridica";
    if (s === "legis" || s === "legispe" || /legis/.test(s)) return "legis.pe";
    if (/elperuano|diario oficial el peruano/.test(s)) return "el peruano";
    if (/onu/.test(s)) return "onu noticias";
    if (/theguardian|guardian/.test(s)) return "guardian";
    if (/nytimes|nyt/.test(s)) return "nyt";
    if (/reuters/.test(s)) return "reuters";
    if (/elpais|el\s*pais/.test(s)) return "el pais";
    return s;
  };

  return arr.map(normProv).filter(Boolean);
}

/* ---------------------- Tokens de búsqueda ---------------------- */
const parseQueryTokens = (q = "") =>
  String(q).split(",").map((t) => t.trim()).filter(Boolean);

/* ---------------------- Heurística “completo” ---------------------- */
function isCompleteEnough(plain = "", html = "") {
  const txt = String(plain || "").trim();
  const len = txt.length;
  const para = (txt.match(/\.\s|\n/g) || []).length;
  const htmlLen = String(html || "").replace(/<[^>]+>/g, "").trim().length;
  return (len >= 700 && para >= 3) || htmlLen >= 900;
}

/* --------------------- Normalizador de salida --------------------- */
function normalize(n, i) {
  const fechaPref =
    n.fecha || n.date || n.publishedAt || n.createdAt || n.updatedAt || null;
  return {
    id: n._id?.toString?.() ?? n.id ?? i,
    titulo: n.titulo || n.title || "Sin título",
    resumen: n.resumen || n.description || n.extracto || "",
    contenido: n.contenido || n.content || n.texto || n.body || "",
    imagen: n.imagen || n.image || n.imageUrl || "/assets/default-news.jpg",
    imagenResuelta: n.imagenResuelta || n.imageResolved || "",
    enlace: n.enlace || n.url || "",
    fuente: n.fuente || n.source || n.provider || "Fuente desconocida",
    fecha: fechaPref,
    especialidad: (n.especialidad || n.area || n.category || "general")?.toString().toLowerCase(),
    tipo: (n.tipo || n.kind || "general")?.toString().toLowerCase(),
    lang: n.lang || n.idioma || "es",
  };
}

/* -------------- caché simple para saber si hay text index ---------- */
let HAS_TEXT_INDEX = null;
async function hasTextIndex() {
  if (HAS_TEXT_INDEX !== null) return HAS_TEXT_INDEX;
  try {
    const idxs = await Noticia.collection.indexes();
    HAS_TEXT_INDEX = idxs.some((ix) => {
      const k = ix?.key || {};
      const keys = Object.keys(k);
      return ix?.textIndexVersion || keys.includes("$**") || keys.some((x) => x.endsWith("_text"));
    });
  } catch {
    HAS_TEXT_INDEX = false;
  }
  return HAS_TEXT_INDEX;
}

/* ------------------ Armado estable de filtro base ------------------ */
/**
 * buildMatchBase: genera un filtro robusto en forma { $and: [...] }
 * evitando $or anidados frágiles.
 * Cambios clave:
 *  - La "especialidad" SOLO aplica cuando tipo=juridica.
 *  - En generales no se usa especialidad; opcionalmente se aceptan providers si el cliente los pasa.
 */
function buildMatchBase({ tipo, especialidad, lang, providers, since }) {
  const isJuridica = tipo === "juridica";
  // "all" => sin filtro explícito por providers
  if (providers.length === 1 && providers[0] === "all") providers = [];

  const clauses = [];

  // 1) tipo / providers
  if (isJuridica) {
    // Jurídicas: forzamos fuentes jurídicas (default si no llega nada)
    const activos = providers.length ? providers : DEFAULT_PROVIDERS_JUR;
    const fuenteOr = [
      { fuenteNorm: { $in: activos } }, // match canónico y rápido
      ...activos.map((p) => ({ fuente: { $regex: safeRegex(`\\b${escapeRx(p)}\\b`, "i") } })), // tolerante
    ];
    clauses.push({
      $or: [
        { tipo: "juridica" },
        {
          $and: [
            { $or: [{ tipo: { $exists: false } }, { tipo: "" }, { tipo: "general" }] },
            { $or: fuenteOr },
          ],
        },
      ],
    });
  } else {
    // Generales: NO imponemos providers, salvo que el cliente los pase explícitos
    const base = { $or: [{ tipo: "general" }, { tipo: { $exists: false } }, { tipo: "" }] };
    if (providers.length) {
      clauses.push({
        $and: [
          base,
          { $or: [{ fuenteNorm: { $in: providers } }, ...providers.map((p) => ({ fuente: { $regex: safeRegex(`\\b${escapeRx(p)}\\b`, "i") } }))] },
        ],
      });
    } else {
      clauses.push(base);
    }
  }

  // 2) idioma
  if (lang && lang !== "all") {
    const rxLang = safeRegex(`^${escapeRx(lang)}`, "i");
    clauses.push({ $or: [{ lang: { $regex: rxLang } }, { lang: { $exists: false } }, { lang: "" }] });
  }

  // 3) especialidad: SOLO jurídicas (← refactor clave)
  if (isJuridica) {
    const espClause = buildEspecialidadClause(especialidad);
    if (espClause) clauses.push(espClause);
  }

  // 4) since
  if (since) clauses.push({ fecha: { $gte: since } });

  return clauses.length ? { $and: clauses } : {};
}

/* ============================================================
   GET /api/noticias
============================================================ */
router.get("/", async (req, res) => {
  try {
    const {
      tipo: tipoRaw,
      t: tRaw,
      especialidad: espRaw,
      q: qRaw,
      tema: temaRaw, // alias de 'q' si llega (solo texto libre aquí)
      lang: langRaw,
      providers: providersRaw,
      completos: completosRaw,
    } = req.query;

    const page  = clamp(toInt(req.query.page, 1), 1, 10_000);
    const limit = clamp(toInt(req.query.limit, 12), 1, 50);

    const tipo         = norm(tipoRaw || tRaw || "general");
    const especialidad = norm(espRaw || "");
    const q            = (qRaw || temaRaw || "").toString().trim();
    const lang         = (langRaw || "").toString().trim().toLowerCase();

    let providers = parseProviders(providersRaw);
    const completos = String(completosRaw || "0") === "1";

    // since (ISO) o sinceDays (número): prioridad para 'since'
    let since = null;
    const sinceRaw = req.query.since;
    const sinceDaysRaw = req.query.sinceDays;

    if (sinceRaw) {
      const d = new Date(sinceRaw);
      if (!Number.isNaN(+d)) since = d;
    } else if (sinceDaysRaw != null) {
      const days = Number(sinceDaysRaw);
      if (Number.isFinite(days) && days > 0) {
        since = new Date(Date.now() - days * 86400000);
      }
    }

    // providers por defecto cuando tipo=juridica y no llega nada
    const faltaProviders =
      providersRaw === undefined ||
      providersRaw === null ||
      (typeof providersRaw === "string" && providersRaw.trim() === "") ||
      (Array.isArray(providersRaw) && providersRaw.length === 0) ||
      providers.length === 0;

    if (tipo === "juridica" && faltaProviders) {
      providers = DEFAULT_PROVIDERS_JUR.slice();
    }

    // filtro base (bloque estable)
    let matchBase = buildMatchBase({ tipo, especialidad, lang, providers, since });

    // búsqueda (q): text index si existe, si no regex por tokens
    let useText = false;
    if (q) useText = await hasTextIndex();

    const qClause = (() => {
      if (!q) return null;
      if (useText) return { $text: { $search: q } };
      const ors = parseQueryTokens(q)
        .map((tok) => {
          const rx = safeRegex(escapeRx(tok), "i");
          return [{ titulo: rx }, { resumen: rx }, { contenido: rx }, { fuente: rx }];
        })
        .flat();
      return ors.length ? { $or: ors } : null;
    })();

    // filtro final
    let filter = matchBase;
    if (qClause) {
      filter = Object.keys(filter).length
        ? { $and: [filter, qClause] }
        : qClause;
    }

    // proyección / orden / paginación
    const skip = (page - 1) * limit;
    const projection = {
      titulo: 1,
      resumen: 1,
      contenido: 1,
      imagen: 1,
      imagenResuelta: 1,
      enlace: 1,
      fuente: 1,
      fuenteNorm: 1,
      fecha: 1,
      especialidad: 1,
      tipo: 1,
      lang: 1,
      ...(useText ? { score: { $meta: "textScore" } } : {}),
    };
    const sort = useText
      ? { score: { $meta: "textScore" }, fecha: -1, _id: -1 }
      : { fecha: -1, _id: -1 };

    const overFetch = completos ? limit * 3 : limit;

    // 🛠 DEBUG
    if (req.query.debug === "1") {
      return res.json({ ok: true, debugFilter: filter });
    }

        const execQuery = async (filt, label = "base") => {
      try {
        const [docsRaw, totalRaw] = await Promise.all([
          Noticia.find(filt)
            .sort(sort)
            .skip(skip)
            .limit(overFetch)
            .select(projection)
            .lean(),
          Noticia.countDocuments(filt),
        ]);
        return { docsRaw, totalRaw, error: null };
      } catch (e) {
        console.error(`❌ GET /api/noticias execQuery (${label}):`, e?.message || e, "\nFiltro:", filt);
        // Devolvemos vacío pero SIN lanzar; así no se dispara el 500 global
        return { docsRaw: [], totalRaw: 0, error: e };
      }
    };

    // Intento 1 (tal cual)
        let { docsRaw, totalRaw } = await execQuery(filter, "base");

    // Fallback #1
        if (!docsRaw.length && since) {
          const f2 = buildMatchBase({ tipo, especialidad, lang, providers, since: null });
          let f2final = f2;
          if (qClause) f2final = { $and: [f2, qClause] };
          ({ docsRaw, totalRaw } = await execQuery(f2final, "sin-since"));
          if (docsRaw.length) filter = f2final;
        }

    // Fallback #2
        const providersWereApplied = (tipo === "juridica") || (tipo !== "juridica" && providers.length > 0);
        if (!docsRaw.length && providersWereApplied) {
          const f3base = buildMatchBase({ tipo, especialidad, lang, providers: [], since });
          let f3final = f3base;
          if (qClause) f3final = { $and: [f3base, qClause] };
          ({ docsRaw, totalRaw } = await execQuery(f3final, "sin-providers"));
          if (docsRaw.length) filter = f3final;
        }

    const docs = completos
      ? docsRaw.filter((n) => isCompleteEnough(n.contenido || n.resumen || "", "")) //
      : docsRaw;

    const pageItems = docs.slice(0, limit).map(normalize);

    return res.json({
      ok: true,
      items: pageItems,
      pagination: {
        page,
        limit,
        total: totalRaw,
        pages: Math.ceil(totalRaw / limit) || 0,
        nextPage: skip + limit < totalRaw ? page + 1 : null,
        hasMore: skip + limit < totalRaw,
      },
      filtros: {
        tipo,
        especialidad: especialidad || "todas",
        q,
        lang: lang || "all",
        providers,
        completos,
        since: since ? since.toISOString() : null,
        sinceDays: sinceDaysRaw != null ? Number(sinceDaysRaw) : null,
      },
    });
  } catch (err) {
    console.error("❌ GET /api/noticias:", err);
    return res.status(500).json({ ok: false, error: "Error al listar noticias" });
  }
});

/* ============================================================
   GET /api/noticias/especialidades
   ?tipo=juridica&lang=es[&providers=all|poder judicial,tc,...]
============================================================ */
  router.get("/especialidades", async (req, res) => {
    try {
      const tipo = norm(req.query.tipo || "juridica");
      const lang = norm(req.query.lang || "");
      let providers = parseProviders(req.query.providers);

      if (tipo === "general") {
        // placeholder fijo para la vista de generales
        return res.json({
          ok: true,
          items: [
            { key: "política", count: 0 },
            { key: "economía", count: 0 },
            { key: "corrupción", count: 0 },
            { key: "ciencia", count: 0 },
            { key: "tecnología", count: 0 },
            { key: "sociedad", count: 0 },
          ],
        });
      }

      const matchBase = { tipo };
      // idioma
      if (lang && lang !== "all") {
        matchBase.$or = (matchBase.$or || []).concat([
          { lang: { $regex: safeRegex(`^${escapeRx(lang)}`, "i") } },
          { lang: { $exists: false } },
          { lang: "" },
        ]);
      }

      // providers (si no es "all", aplicar por canónicos + regex de apoyo)
      const isAll = providers.length === 1 && providers[0] === "all";
      if (!providers.length && !isAll) providers = DEFAULT_PROVIDERS_JUR.slice();
      if (providers.length && !isAll) {
        const rxList = providers.map((p) => safeRegex(`\\b${escapeRx(p)}\\b`, "i"));
        matchBase.$or = (matchBase.$or || []).concat([
          { fuenteNorm: { $in: providers } },
          ...rxList.map((rx) => ({ fuente: { $regex: rx } })),
        ]);
      }

      const ESPEC_REGEX = {
        penal: /(penal|delito|fiscal|ministerio publico|mp)/i,
        civil: /(civil|propiedad|contrato|obligaciones)/i,
        laboral: /(laboral|trabajador|sindicato|sunafil)/i,
        constitucional: /(constitucional|tribunal constitucional|tc)/i,
        familiar: /(familia|alimentos|tenencia|violencia familiar)/i,
        administrativo: /(administrativo|tupa|procedimiento administrativo|resolucion)/i,
        comercial: /(comercial|mercantil|societario|empresa)/i,
        tributario: /(tributario|sunat|igv|renta|impuesto)/i,
        procesal: /(procesal|proceso|procedimiento)/i,
        registral: /(registral|sunarp|registro|partida)/i,
        ambiental: /(ambiental|oefa|eia|impacto ambiental)/i,
        notarial: /(notarial|notario)/i,
        penitenciario: /(penitenciario|inpe|prision)/i,
        consumidor: /(consumidor|indecopi|proteccion al consumidor)/i,
        "seguridad social": /(seguridad social|previsional|pensiones?)/i,
        "derechos humanos": /(derechos humanos|corte idh|cidh|oea|onu derechos|convencion americana)/i,
        internacional: /(internacional|onu|oea|cij|tjue|corte internacional)/i,
      };
      const keys = Object.keys(ESPEC_REGEX);

      const addFields = {
        _text: {
          $toLower: {
            $concat: [
              { $ifNull: ["$especialidad", ""] }, " ",
              { $ifNull: ["$area", ""] }, " ",
              { $ifNull: ["$categoria", ""] }, " ",
              { $ifNull: ["$titulo", ""] }, " ",
              { $ifNull: ["$resumen", ""] }, " ",
              { $ifNull: ["$contenido", ""] }, " ",
              { $ifNull: ["$fuente", ""] },
            ],
          },
        },
      };

      const groupSpec = keys.reduce((acc, k) => {
        acc[k] = {
          $sum: {
            $cond: [
              { $regexMatch: { input: "$_text", regex: ESPEC_REGEX[k] } },
              1,
              0,
            ],
          },
        };
        return acc;
      }, {});

      const projectSpec = {
        _id: 0,
        items: keys.map((k) => ({ key: k, count: `$${k}` })),
      };

      const pipeline = [
        { $match: matchBase },
        { $addFields: addFields },
        { $group: Object.assign({ _id: null }, groupSpec) },
        { $project: projectSpec },
      ];

      if (req.query.debug === "1") {
        return res.json({ ok: true, matchBase, pipeline });
      }

      let items;
      try {
        const agg = await Noticia.aggregate(pipeline);
        items = agg[0]?.items ?? keys.map((k) => ({ key: k, count: 0 }));
      } catch (e) {
        console.error("❌ GET /api/noticias/especialidades aggregate fallo:", e?.message || e);
        // Fallback: devolvemos catálogo estático, sin 500
        items = keys.map((k) => ({ key: k, count: 0 }));
      }

      return res.json({ ok: true, items });
    } catch (err) {
      console.error("❌ GET /api/noticias/especialidades (wrap):", err);
      // Último fallback: devolver catálogo base en 200
      const base = [
        "penal","civil","laboral","constitucional","familiar","administrativo",
        "comercial","tributario","procesal","registral","ambiental","notarial",
        "penitenciario","consumidor","seguridad social","derechos humanos","internacional",
      ];
      return res.json({
        ok: true,
        items: base.map((k) => ({ key: k, count: 0 })),
      });
    }
  });

/* ============================================================
   GET /api/noticias/temas
   - Devuelve temas disponibles para "general" priorizando los que existan en BD.
============================================================ */
router.get("/temas", async (req, res) => {
  try {
    // 1) Si tienes campo 'tema' (array) en documentos de tipo general, úsalo:
    const rows = await Noticia.aggregate([
      { $match: { $or: [{ tipo: "general" }, { tipo: { $exists: false } }, { tipo: "" }] } },
      { $unwind: { path: "$tema", preserveNullAndEmptyArrays: false } },
      { $group: { _id: { $toLower: "$tema" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 24 },
      { $project: { _id: 0, key: "$_id", count: 1 } },
    ]);

    if (rows && rows.length) {
      return res.json({ ok: true, items: rows });
    }

    // 2) Fallback: catálogo base
    const base = ["política","economía","corrupción","ciencia","tecnología","sociedad","internacional"];
    return res.json({ ok: true, items: base.map((k) => ({ key: k, count: 0 })) });
  } catch (err) {
    console.error("❌ GET /api/noticias/temas:", err);
    return res.status(500).json({ ok: false, error: "Error al obtener temas" });
  }
});

// ============================================================
// 🔍 Debug temporal: contar noticias LP que ve ESTE backend
//   GET /api/noticias/debug-lp
// ============================================================
router.get("/debug-lp", async (req, res) => {
  try {
    const filtro = {
      $or: [
        { fuente: /lp\s*derecho/i },
        { enlace: /lpderecho\.pe/i },
      ],
    };

    const total = await Noticia.countDocuments(filtro);
    const muestra = await Noticia.find(filtro)
      .sort({ fecha: -1 })
      .limit(3)
      .select("titulo tipo lang fuente fuenteNorm enlace especialidad");

    return res.json({
      ok: true,
      total,
      sample: muestra,
    });
  } catch (err) {
    console.error("❌ Error en /api/noticias/debug-lp:", err);
    return res.status(500).json({ ok: false, error: err.message || "error" });
  }
});

export default router;
