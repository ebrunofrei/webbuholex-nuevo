// ============================================================
// 🦉 BÚHOLEX | Rutas de Noticias (MongoDB)
//   GET /api/noticias
//   GET /api/noticias/especialidades
// - Salida: { ok, items, pagination, filtros }
// - Filtros: tipo, especialidad (+sinónimos), q|tema, lang, providers, completos
// - Paginación segura (page, limit 1..50) y orden robusto
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
  s?.toString().trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "") || "";
const escapeRx = (s = "") => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const addAnd = (filter, clause) => {
  if (!clause) return;
  filter.$and ? filter.$and.push(clause) : (filter.$and = [clause]);
};
const addOr = (filter, list) => {
  if (!list?.length) return;
  filter.$or ? (filter.$or = filter.$or.concat(list)) : (filter.$or = list.slice());
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
  ambiental: ["oeefa", "impacto ambiental", "eia"],
  consumidor: ["indecopi", "proteccion al consumidor"],
  penitenciario: ["inpe", "prision", "penitenciario"],
};

/* -------------------- Providers por defecto JUR ------------------- */
const DEFAULT_PROVIDERS_JUR = [
  "poder judicial","pj","corte suprema","tribunal constitucional","tc",
  "sunarp","el peruano","gaceta","gaceta juridica","legis","legis.pe",
  "corte idh","cij","tjue","oea","onu","minjus","mp","ministerio publico","fiscalia"
];

/* --------- Clausula flexible de especialidad (con fallback) --------- */
function buildEspecialidadClause(valor) {
  const key = norm(valor);
  if (!key || key === "todas") return null;
  const tokens = [key, ...(ESPECIALIDAD_EQ[key] || [])].map(escapeRx).join("|");
  const rx = new RegExp(`\\b(${tokens})\\b`, "i");
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
function parseProviders(input) {
  if (!input) return [];
  const arr = Array.isArray(input) ? input : String(input).split(",");

  return arr
    .map((x) => norm(x)
      .replace(/^https?:\/\/(www\.)?/, "")
      .replace(/\.(pe|com|org|net|es)$/g, "")
      .replace(/\./g, "")
      .replace(/noticias$/i, "")
      .replace(/theguardian/, "guardian")
      .replace(/nytimes/, "nyt")
      // alias locales:
      .replace(/^pj$/, "poder judicial")
      .replace(/^pjudicial$/, "poder judicial")
      .replace(/^tribunal constitucional$/, "tc")
    )
    .filter(Boolean);
}
/* ---------------------- Tokens de búsqueda ---------------------- */
function parseQueryTokens(q = "") {
  return String(q)
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

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
    enlace: n.enlace || n.url || "",
    fuente: n.fuente || n.source || n.provider || "Fuente desconocida",
    fecha: fechaPref,
    especialidad: (n.especialidad || n.area || n.category || "general")?.toString().toLowerCase(),
    tipo: (n.tipo || n.kind || "general")?.toString().toLowerCase(),
    lang: n.lang || n.idioma || "es",
  };
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
      tema: temaRaw,
      lang: langRaw,
      providers: providersRaw,
      completos: completosRaw,
    } = req.query;

    const page = clamp(toInt(req.query.page, 1), 1, 10_000);
    const limit = clamp(toInt(req.query.limit, 12), 1, 50);

    const tipo = norm(tipoRaw || tRaw || "general");
    const especialidad = norm(espRaw || "");
    const q = (qRaw || temaRaw || "").toString().trim();
    const lang = (langRaw || "").toString().trim().toLowerCase();
    let providers = parseProviders(providersRaw);
    const completos = String(completosRaw || "0") === "1";

    // Defaults de providers SOLO para jurídicas y cuando no se manda nada (ni 'all')
    const faltaProviders =
      providersRaw === undefined ||
      providersRaw === null ||
      (typeof providersRaw === "string" && providersRaw.trim() === "") ||
      (Array.isArray(providersRaw) && providersRaw.length === 0) ||
      providers.length === 0;

    if (tipo === "juridica" && faltaProviders) {
      providers = DEFAULT_PROVIDERS_JUR.slice();
    }

      // --------- Filtro base ----------
      let filter = {};
      if (tipo === "general") {
        // Acepta general, vacío o sin campo 'tipo'
        addAnd(filter, { $or: [ { tipo: "general" }, { tipo: { $exists: false } }, { tipo: "" } ] });
      } else {
        addAnd(filter, { tipo }); // "juridica", etc.
      }

      if (lang && lang !== "all") {
        addAnd(filter, { $or: [
        { lang: { $regex: new RegExp(`^${escapeRx(lang)}`, "i") } },
        { lang: { $exists: false } }, { lang: "" }
      ]});
    }


    /* ------------------- Filtro especialidad ------------------ */
    if (tipo !== "general") {
      if (especialidad && especialidad !== "todas") {
        addAnd(filter, buildEspecialidadClause(especialidad));
      }
    } else if (especialidad && especialidad !== "todas") {
      const rxEsp = new RegExp(escapeRx(especialidad), "i");
      addOr(filter, [
        { titulo: rxEsp },
        { resumen: rxEsp },
        { contenido: rxEsp },
        { fuente: rxEsp },
        { categoria: rxEsp },
      ]);
    }

    /* --------------------- Filtro providers ------------------- */
    if (providers.length) {
      const isAll = providers.length === 1 && providers[0] === "all";
      if (!isAll) {
        const rxList = providers.map((p) => new RegExp(`\\b${escapeRx(p)}\\b`, "i"));
        addAnd(filter, { $or: rxList.map((rx) => ({ fuente: { $regex: rx } })) });
      }
    }

    /* ---------------- Búsqueda por texto (q) ------------------ */
    let useText = false;
    if (q) {
      try {
        const idxs = await Noticia.collection.indexes();
        useText = idxs.some((ix) => {
          const k = ix?.key || {};
          const keys = Object.keys(k);
          return ix?.textIndexVersion || keys.includes("$**") || keys.some((x) => x.endsWith("_text"));
        });
      } catch {
        useText = false;
      }
    }
    if (q) {
      if (useText) {
        addAnd(filter, { $text: { $search: q } });
      } else {
        const ors = parseQueryTokens(q)
          .map((tok) => {
            const rx = new RegExp(escapeRx(tok), "i");
            return [{ titulo: rx }, { resumen: rx }, { contenido: rx }, { fuente: rx }];
          })
          .flat();
        addOr(filter, ors);
      }
    }

    /* --------------- Proyección / Orden / Paginación ---------- */
    const skip = (page - 1) * limit;
    const projection = {
      titulo: 1,
      resumen: 1,
      contenido: 1,
      imagen: 1,
      enlace: 1,
      fuente: 1,
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

    // 🛠 DEBUG OPCIONAL
    if (req.query.debug === "1") {
      return res.json({ ok: true, debugFilter: filter });
    }

    const [docsRaw, totalRaw] = await Promise.all([
      Noticia.find(filter).sort(sort).skip(skip).limit(overFetch).select(projection).lean(),
      Noticia.countDocuments(filter),
    ]);

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
      },
    });
  } catch (err) {
    console.error("❌ GET /api/noticias:", err);
    return res.status(500).json({ ok: false, error: "Error al listar noticias" });
  }
});

/* ============================================================
   GET /api/noticias/especialidades?tipo=juridica&lang=es[&providers=all|poder judicial,tc,...]
   - Cuenta PENAL / CIVIL / LABORAL aún si especialidad está "general"
   - Por defecto filtra por proveedores jurídicos; usa providers=all para no filtrar
============================================================ */
router.get("/especialidades", async (req, res) => {
  try {
    const tipo = norm(req.query.tipo || "juridica");
    const lang = norm(req.query.lang || "");
    let providers = parseProviders(req.query.providers);

    if (tipo === "general") {
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

    // --------- match base ---------
    const matchBase = { tipo };
    if (lang && lang !== "all") {
      matchBase.lang = { $regex: new RegExp(`^${escapeRx(lang)}`, "i") };
    }

    // providers: por defecto los jurídicos; usa providers=all para no filtrar
    const isAll = providers.length === 1 && providers[0] === "all";
    if (!providers.length && !isAll) providers = DEFAULT_PROVIDERS_JUR.slice();
    if (providers.length && !isAll) {
      const rxList = providers.map((p) => new RegExp(`\\b${escapeRx(p)}\\b`, "i"));
      matchBase.$or = rxList.map((rx) => ({ fuente: { $regex: rx } }));
    }

    // ========= NUEVO: catálogo ampliado de especialidades =========
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
      ambiental: /(ambiental|oeefa|eia|impacto ambiental)/i,
      notarial: /(notarial|notario)/i,
      penitenciario: /(penitenciario|inpe|prision)/i,
      consumidor: /(consumidor|indecopi|proteccion al consumidor)/i,
      "seguridad social": /(seguridad social|previsional|pensiones?)/i,
      // nuevos que usan tus providers:
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
      acc[k] = { $sum: { $cond: [{ $regexMatch: { input: "$_text", regex: ESPEC_REGEX[k] } }, 1, 0] } };
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

    // 🛠 DEBUG opcional
    if (req.query.debug === "1") {
      return res.json({ ok: true, matchBase, pipeline });
    }

    const agg = await Noticia.aggregate(pipeline);
    const items = agg[0]?.items ?? keys.map((k) => ({ key: k, count: 0 }));
    return res.json({ ok: true, items });
  } catch (err) {
    console.error("❌ GET /api/noticias/especialidades:", err);
    return res.status(500).json({ ok: false, error: "Error al obtener especialidades" });
  }
});

export default router;
