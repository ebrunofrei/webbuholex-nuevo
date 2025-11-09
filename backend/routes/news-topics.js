// backend/routes/news-topics.js
import express from "express";
import Noticia from "../models/Noticia.js";

const router = express.Router();

// ---------- helpers ----------
const norm = (s = "") =>
  String(s).toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const rxw = (kw) => new RegExp(`\\b${esc(kw)}\\b`, "i");
const splitCSV = (s = "") => s.split(",").map((x) => norm(x).trim()).filter(Boolean);

// ---------- mapeo de temas ----------
const TOPIC_MAP = {
  politica: {
    mustAny: ["congreso", "ministro", "presidente", "decreto", "ley", "partido"],
    should:  ["gabinete", "pleno", "comisión", "elecciones", "fiscalía", "contraloría"],
    stop:    ["deportes", "fútbol", "futbol", "selección", "espectáculos", "farandula", "gaming"],
    providers: ["rpp", "elcomercio", "andina", "bbc", "reuters"],
  },
  economia: {
    mustAny: ["inflación", "tipo de cambio", "dólar", "bcr", "pbi", "inversión", "mercado", "empresa", "minería", "mineria", "exportaciones"],
    should:  ["sunat", "inmobiliario", "bolsa", "bonos", "petróleo", "petroleo", "gas", "empleo"],
    stop:    ["deportes", "espectáculos", "celebridad", "gaming"],
    providers: ["gestion", "rpp", "reuters", "elcomercio", "bloomberg"],
  },
  tecnologia: {
    mustAny: ["ia", "inteligencia artificial", "software", "ciberseguridad", "startups", "apps", "cloud", "nube", "datos", "chip", "semiconductores"],
    should:  ["open-source", "actualización", "lanzamiento", "api", "plataforma", "modelo"],
    stop:    ["deportes", "farándula", "celebridad", "espectáculos"],
    providers: ["xataka", "genbeta", "theverge", "bbc", "reuters"],
  },
  corrupcion: {
    mustAny: ["corrupción", "corrupcion", "cohecho", "colusión", "colusion", "lavado de activos", "soborno", "peculado"],
    should:  ["investigación", "fiscalía", "sentencia", "procesados", "contraloría", "auditoría"],
    stop:    ["deportes", "espectáculos", "celebridad", "gaming"],
    providers: ["rpp", "andina", "elcomercio", "reuters", "bbc"],
  },
  ciencia: {
    mustAny: ["estudio", "investigación", "investigacion", "paper", "revista científica", "revista cientifica", "universidad", "experimento"],
    should:  ["salud", "astronomía", "astronomia", "espacio", "biología", "biologia", "física", "fisica", "química", "quimica"],
    stop:    ["deportes", "espectáculos", "celebridad"],
    providers: ["nature", "sciencedaily", "bbc", "reuters"],
  },
  sociedad: {
    mustAny: ["educación", "educacion", "seguridad", "salud", "transporte", "ciudadanos", "municipal", "servicios"],
    should:  ["tránsito", "transito", "inseguridad", "hospitales", "colegios", "población"],
    stop:    ["deportes profesionales", "celebridad", "farándula"],
    providers: ["rpp", "elcomercio", "andina", "bbc", "reuters"],
  },
};

router.get("/", async (req, res) => {
  try {
    const {
      tema = "",
      q = "",
      providers = "",
      sinceDays = "3",
      sort = "publishedAt_desc",
      page = "1",
      limit = "20",
      lang = "es",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const since = new Date(Date.now() - (Math.max(0, parseInt(sinceDays, 10) || 3) * 86400000));

    // base match
    const match = { publishedAt: { $gte: since } };
    if (lang) match.lang = lang;

    // providers
    let providersList = [];
    if (providers) providersList = splitCSV(providers);
    else if (TOPIC_MAP[tema]) providersList = TOPIC_MAP[tema].providers || [];
    if (providersList.length) match.providerNorm = { $in: providersList };

    // tema → must/stop
    const t = TOPIC_MAP[tema] || null;
    const fields = ["titulo", "resumen", "contenido", "categoria", "tags"];
    const orMust = [];
    if (t?.mustAny?.length) {
      orMust.push({
        $or: t.mustAny.flatMap((kw) => fields.map((f) => ({ [f]: rxw(kw) }))),
      });
    }

    // búsqueda libre q (opcional)
    if (q) {
      orMust.push({ $or: fields.map((f) => ({ [f]: { $regex: q, $options: "i" } })) });
    }

    if (orMust.length) match.$and = (match.$and || []).concat([{ $or: orMust }]);

    // stopwords duras
    if (t?.stop?.length) {
      const nots = t.stop.map((kw) => ({
        $nor: fields.map((f) => ({ [f]: rxw(kw) })),
      }));
      match.$and = (match.$and || []).concat(nots);
    }

    // ranking por should
    const addRank = {
      $addFields: {
        _rank: {
          $add: (t?.should || []).map((kw) => ({
            $cond: [
              {
                $regexMatch: {
                  input: { $concat: fields.map((f) => ({ $ifNull: [`$${f}`, ""] })) },
                  regex: rxw(kw),
                },
              },
              1,
              0,
            ],
          })),
        },
      },
    };

    const sortStage =
      sort === "publishedAt_asc"
        ? { $sort: { publishedAt: 1, _rank: -1 } }
        : { $sort: { publishedAt: -1, _rank: -1 } };

    const skip = (pageNum - 1) * limitNum;

    const pipeline = [
      { $match: match },
      addRank,
      sortStage,
      { $skip: skip },
      { $limit: limitNum },
      {
        $project: {
          _id: 0,
          titulo: 1,
          resumen: 1,
          contenido: 1,
          url: 1,
          urlImagen: 1,
          provider: 1,
          providerNorm: 1,
          categoria: 1,
          tags: 1,
          lang: 1,
          publishedAt: 1,
          _rank: 1,
        },
      },
    ];

    const [items, totalAgg] = await Promise.all([
      Noticia.aggregate(pipeline),
      Noticia.aggregate([{ $match: match }, { $count: "total" }]),
    ]);

    res.json({
      ok: true,
      tema: tema || null,
      q,
      providers: providersList,
      sinceDays: Number(sinceDays) || 3,
      sort,
      page: pageNum,
      limit: limitNum,
      total: totalAgg?.[0]?.total || 0,
      items,
    });
  } catch (err) {
    console.error("[/api/news] error:", err);
    res.status(500).json({ ok: false, error: "INTERNAL_ERROR", detail: String(err?.message || err) });
  }
});

export default router;
