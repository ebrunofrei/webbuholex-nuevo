// backend/routes/news-topics.js
// ============================================================
// 🦉 BÚHOLEX | News por Tema (Generales, Mongo)
//   GET /api/news?tema=economia&sinceDays=5&limit=20
//   Params: tema, q, providers, since|sinceDays, lang, page, limit, sort
// - Aplica mapeo de tema → keywords (must/should/stop) + providers sugeridos
// - Orden: publishedAt(fecha) desc + rank por "should"
// ============================================================
import { Router } from "express";
import Noticia from "../models/Noticia.js";

const router = Router();

const norm = (s="") => String(s).toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu,"");
const esc  = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const rxw  = (kw) => new RegExp(`\\b${esc(kw)}\\b`, "i");
const clamp = (n, lo, hi) => Math.min(Math.max(Number(n)||0, lo), hi);
const toInt = (v, d) => { const n = parseInt(v, 10); return Number.isFinite(n)&&n>0?n:d; };
const splitCSV = (s="") => s.split(",").map(x=>norm(x).trim()).filter(Boolean);

// ---------- Mapeo de temas ----------
const TOPIC_MAP = {
  politica: {
    mustAny: ["congreso","ministro","presidente","decreto","ley","partido"],
    should:  ["gabinete","pleno","comisión","elecciones","fiscalía","contraloría"],
    stop:    ["deportes","fútbol","futbol","selección","espectáculos","farandula","gaming"],
    providers: ["rpp","elcomercio","andina","bbc","reuters"],
  },
  economia: {
    mustAny: ["inflación","tipo de cambio","dólar","bcr","pbi","inversión","mercado","empresa","minería","mineria","exportaciones"],
    should:  ["sunat","inmobiliario","bolsa","bonos","petróleo","petroleo","gas","empleo"],
    stop:    ["deportes","espectáculos","celebridad","gaming"],
    providers: ["gestion","rpp","reuters","elcomercio","bloomberg"],
  },
  tecnologia: {
    mustAny: ["ia","inteligencia artificial","software","ciberseguridad","startups","apps","cloud","nube","datos","chip","semiconductores"],
    should:  ["open-source","actualización","lanzamiento","api","plataforma","modelo"],
    stop:    ["deportes","farándula","celebridad","espectáculos"],
    providers: ["xataka","genbeta","theverge","bbc","reuters"],
  },
  corrupcion: {
    mustAny: ["corrupción","corrupcion","cohecho","colusión","colusion","lavado de activos","soborno","peculado"],
    should:  ["investigación","fiscalía","sentencia","procesados","contraloría","auditoría"],
    stop:    ["deportes","espectáculos","celebridad","gaming"],
    providers: ["rpp","andina","elcomercio","reuters","bbc"],
  },
  ciencia: {
    mustAny: ["estudio","investigación","investigacion","paper","revista científica","revista cientifica","universidad","experimento"],
    should:  ["salud","astronomía","astronomia","espacio","biología","biologia","física","fisica","química","quimica"],
    stop:    ["deportes","espectáculos","celebridad"],
    providers: ["nature","sciencedaily","bbc","reuters"],
  },
  sociedad: {
    mustAny: ["educación","educacion","seguridad","salud","transporte","ciudadanos","municipal","servicios"],
    should:  ["tránsito","transito","inseguridad","hospitales","colegios","población"],
    stop:    ["deportes profesionales","celebridad","farándula"],
    providers: ["rpp","elcomercio","andina","bbc","reuters"],
  },
};

router.get("/", async (req, res) => {
  try {
    const {
      tema = "",
      q = "",
      providers = "",
      sinceDays = "3",
      since: sinceISO,
      sort = "publishedAt_desc",  // or "publishedAt_asc"
      page = "1",
      limit = "20",
      lang = "es",
    } = req.query;

    const pageNum  = clamp(toInt(page, 1), 1, 10_000);
    const limitNum = clamp(toInt(limit, 20), 1, 50);

    let since = null;
    if (sinceISO) {
      const d = new Date(sinceISO);
      if (!Number.isNaN(+d)) since = d;
    } else {
      const days = Math.max(0, parseInt(sinceDays, 10) || 3);
      since = new Date(Date.now() - days * 86400000);
    }

    // Base match
    const match = {
      // tipo general o sin tipar
      $or: [{ tipo: "general" }, { tipo: { $exists: false } }, { tipo: "" }],
      fecha: { $gte: since },
    };
    if (lang && lang !== "all") match.lang = new RegExp(`^${esc(lang)}`, "i");

    // Providers
    let providersList = [];
    if (providers) providersList = splitCSV(providers);
    else if (TOPIC_MAP[tema]) providersList = TOPIC_MAP[tema].providers || [];
    if (providersList.length) {
      match.$and = (match.$and || []).concat([
        { $or: [{ fuenteNorm: { $in: providersList } }, ...providersList.map(p => ({ fuente: rxw(p) }))] },
      ]);
    }

    // Tema → must / stop
    const t = TOPIC_MAP[tema] || null;
    const fields = ["titulo","resumen","contenido","categoria","tags"];

    const orMust = [];
    if (t?.mustAny?.length) {
      orMust.push({
        $or: t.mustAny.flatMap(kw => fields.map(f => ({ [f]: rxw(kw) }))),
      });
    }
    if (q) {
      orMust.push({ $or: fields.map(f => ({ [f]: { $regex: q, $options: "i" } })) });
    }
    if (orMust.length) match.$and = (match.$and || []).concat([{ $or: orMust }]);

    if (t?.stop?.length) {
      const nots = t.stop.map(kw => ({ $nor: fields.map(f => ({ [f]: rxw(kw) })) }));
      match.$and = (match.$and || []).concat(nots);
    }

    // Ranking por "should"
    const addRank = {
      $addFields: {
        _rank: {
          $add: (t?.should || []).map(kw => ({
            $cond: [
              { $regexMatch: { input: { $concat: fields.map(f => ({ $ifNull: [`$${f}`, ""] })) }, regex: rxw(kw) } },
              1, 0
            ],
          })),
        },
      },
    };

    const sortStage = sort === "publishedAt_asc"
      ? { $sort: { fecha: 1, _rank: -1, _id: -1 } }
      : { $sort: { fecha: -1, _rank: -1, _id: -1 } };

    const pipeline = [
      { $match: match },
      addRank,
      sortStage,
      { $skip: (pageNum - 1) * limitNum },
      { $limit: limitNum },
      {
        $project: {
          _id: 0,
          titulo: 1,
          resumen: 1,
          contenido: 1,
          enlace: 1,
          imagen: 1,
          imagenResuelta: 1,
          fuente: 1,
          fuenteNorm: 1,
          categoria: 1,
          tags: 1,
          lang: 1,
          fecha: 1,
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
      since: since.toISOString(),
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
