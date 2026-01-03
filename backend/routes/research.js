// backend/routes/research.js
// ============================================================
// 🦉 LitisBot | Motor de Investigación Universal (Google CSE)
// ------------------------------------------------------------
// - GET /api/research/health
// - GET /api/research/search?q=...&num=3&lr=lang_es&start=1
//
// FASE 1 + 2 – SEC-LITIS UNIVERSAL
//   · Fuentes jurídicas (LatAm, Europa, supranacionales)
//   · Fuentes científicas, filosóficas y psicológicas de alto nivel
//   · Allow-list global + Block-list dura
//   · trustScore por tipo de dominio + corte MIN_TRUST_SCORE
//   · Ingesta automática en Mongo (LegalKnowledge)
// ============================================================

import express from "express";
import fetch from "node-fetch";
import LegalKnowledge from "../models/LegalKnowledge.js";

const router = express.Router();

/* --------------------------- Config / entorno --------------------------- */

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID || "";

const ENABLE_RESEARCH =
  String(process.env.ENABLE_RESEARCH || "").toLowerCase() === "true";

const MAX_RESULTS_ENV = parseInt(
  process.env.RESEARCH_MAX_RESULTS || "6",
  10
);

const MAX_RESULTS = Math.min(Math.max(MAX_RESULTS_ENV || 6, 1), 10);

const ENV_ALLOWED_DOMAINS = (process.env.RESEARCH_ALLOWED_DOMAINS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const ENV_BLOCKED_DOMAINS = (process.env.RESEARCH_BLOCKED_DOMAINS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const HAS_KEYS = Boolean(GOOGLE_API_KEY && GOOGLE_CSE_ID);

/* ------------------------ Listas de dominios base ----------------------- */

// (mismas listas universales que ya definimos: cortes, diarios, universidades,
// ciencia, filosofía, psicología, etc.)
const COURTS_GLOBAL = [
  "pj.gob.pe",
  "tc.gob.pe",
  "scjn.gob.mx",
  "cjf.gob.mx",
  "corteconstitucional.gov.co",
  "ramajudicial.gov.co",
  "csj.gov.co",
  "csjn.gov.ar",
  "pjn.gov.ar",
  "pjud.cl",
  "tribunalconstitucional.cl",
  "stf.jus.br",
  "stj.jus.br",
  "poderjudicial.gub.uy",
  "corteconstitucional.gob.ec",
  "funcionjudicial.gob.ec",
  "tsj.bo",
  "tribunalconstitucional.bo",
  "poderjudicial.es",
  "tribunalconstitucional.es",
  "cortecostituzionale.it",
  "cortedicassazione.it",
  "courdecassation.fr",
  "conseil-constitutionnel.fr",
  "bundesverfassungsgericht.de",
  "bundesgerichtshof.de",
  "supremecourt.gov",
  "supremecourt.uk",
];

const COURTS_SUPRANATIONAL = [
  "corteidh.or.cr",
  "curia.europa.eu",
  "hudoc.echr.coe.int",
  "echr.coe.int",
  "icc-cpi.int",
  "icj-cij.org",
];

const OFFICIAL_GAZETTES = [
  "elperuano.pe",
  "dof.gob.mx",
  "diariooficial.gov.co",
  "boletinoficial.gob.ar",
  "diariooficial.interior.gob.cl",
  "impo.com.uy",
  "boe.es",
  "legifrance.gouv.fr",
  "gazzettaufficiale.it",
  "eur-lex.europa.eu",
];

const UNIVERSITIES = [
  "pucp.edu.pe",
  "unmsm.edu.pe",
  "ulima.edu.pe",
  "up.edu.pe",
  "uarm.edu.pe",
  "uandina.edu.pe",
  "unam.mx",
  "udem.edu.mx",
  "uanl.mx",
  "uba.ar",
  "uc.cl",
  "uniandes.edu.co",
  "javeriana.edu.co",
  "harvard.edu",
  "yale.edu",
  "stanford.edu",
  "mit.edu",
  "ox.ac.uk",
  "cam.ac.uk",
  "ub.edu",
  "usal.es",
];

const LEGAL_PUBLISHERS = [
  "lpderecho.pe",
  "gacetajuridica.com.pe",
  "legis.com.co",
  "thomsonreuters.com",
  "aranzadi.es",
  "vlex.com",
  "elderecho.com",
];

const ORG_PUBLIC = [
  "defensoria.gob.pe",
  "contraloria.gob.pe",
  "onpe.gob.pe",
  "jne.gob.pe",
  "sunat.gob.pe",
  "sunarp.gob.pe",
  "osce.gob.pe",
  "osiptel.gob.pe",
  "osinergmin.gob.pe",
  "susalud.gob.pe",
  "minjus.gob.pe",
  "minjusdh.gob.pe",
  "cndh.org.mx",
  "inai.org.mx",
  "defensoria.gov.co",
  "procuraduria.gov.co",
  "defensordelpueblo.es",
  "agpd.es",
  "ombudsman.europa.eu",
];

const SCIENCE_DOMAINS = [
  "nature.com",
  "science.org",
  "sciencedirect.com",
  "springer.com",
  "springerlink.com",
  "wiley.com",
  "acs.org",
  "royalsociety.org",
  "nih.gov",
  "ncbi.nlm.nih.gov",
  "nasa.gov",
  "noaa.gov",
  "who.int",
];

const TECH_FORENSIC_DOMAINS = [
  "ieee.org",
  "acm.org",
  "nist.gov",
  "csrc.nist.gov",
  "iso.org",
];

const ECON_DOMAINS = [
  "imf.org",
  "worldbank.org",
  "oecd.org",
  "un.org",
  "ilo.org",
  "fao.org",
  "undp.org",
];

const PHILOSOPHY_DOMAINS = [
  "plato.stanford.edu",
  "iep.utm.edu",
  "philpapers.org",
  "philosophy.ox.ac.uk",
  "cam.ac.uk",
  "harvard.edu",
  "yale.edu",
];

const PSYCHOLOGY_DOMAINS = [
  "apa.org",
  "psycnet.apa.org",
  "cambridge.org",
  "sagepub.com",
  "tandfonline.com",
  "springer.com",
  "sciencedirect.com",
];

const ALL_ALLOWED_DOMAINS = Array.from(
  new Set([
    ...COURTS_GLOBAL,
    ...COURTS_SUPRANATIONAL,
    ...OFFICIAL_GAZETTES,
    ...UNIVERSITIES,
    ...LEGAL_PUBLISHERS,
    ...ORG_PUBLIC,
    ...SCIENCE_DOMAINS,
    ...TECH_FORENSIC_DOMAINS,
    ...ECON_DOMAINS,
    ...PHILOSOPHY_DOMAINS,
    ...PSYCHOLOGY_DOMAINS,
    ...ENV_ALLOWED_DOMAINS,
  ])
).filter(Boolean);

const BASE_BLOCKED_DOMAINS = [
  "monografias.com",
  "rincondelvago.com",
  "taringa.net",
  "prezi.com",
  "brainly.lat",
  "scribd.com",
  "wattpad.com",
  "slideshare.net",
  "es.slideshare.net",
  "docsity.com",
  "buenastareas.com",
  "gestiopolis.com",
  "desarrollandoideas.net",
  "blogspot.com",
  "blogspot.pe",
  "wordpress.com",
  "wikipedia.org",
];

const BLOCKED_HOSTS = new Set(
  [...BASE_BLOCKED_DOMAINS, ...ENV_BLOCKED_DOMAINS].map((d) =>
    d.trim().toLowerCase()
  )
);

/* --------------------------- Utilidades varias -------------------------- */

function sendError(res, status, payload) {
  return res.status(status).json({ ok: false, ...payload });
}

function normalizeHost(host = "") {
  return host.replace(/^https?:\/\//i, "").replace(/^www\./i, "").toLowerCase();
}

function normalizeText(str = "") {
  return String(str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function isBlockedHost(host) {
  const h = normalizeHost(host);
  if (!h) return true;
  if (BLOCKED_HOSTS.has(h)) return true;
  return Array.from(BLOCKED_HOSTS).some(
    (b) => h === b || h.endsWith(`.${b}`)
  );
}

function isAllowedHost(host) {
  const h = normalizeHost(host);
  if (!h) return false;
  if (!ALL_ALLOWED_DOMAINS.length) return false;

  return ALL_ALLOWED_DOMAINS.some((dom) => {
    const d = dom.toLowerCase();
    return h === d || h.endsWith(`.${d}`);
  });
}

function computeTrustScore(host, snippet = "") {
  const h = normalizeHost(host);
  if (isBlockedHost(h)) return 0;

  if (
    COURTS_GLOBAL.some((d) => h === d || h.endsWith(`.${d}`)) ||
    COURTS_SUPRANATIONAL.some((d) => h === d || h.endsWith(`.${d}`))
  )
    return 1.0;

  if (OFFICIAL_GAZETTES.some((d) => h === d || h.endsWith(`.${d}`)))
    return 0.95;

  if (UNIVERSITIES.some((d) => h === d || h.endsWith(`.${d}`))) return 0.9;

  if (LEGAL_PUBLISHERS.some((d) => h === d || h.endsWith(`.${d}`)))
    return 0.85;

  if (ORG_PUBLIC.some((d) => h === d || h.endsWith(`.${d}`))) return 0.8;

  if (SCIENCE_DOMAINS.some((d) => h === d || h.endsWith(`.${d}`)))
    return 0.95;

  if (TECH_FORENSIC_DOMAINS.some((d) => h === d || h.endsWith(`.${d}`)))
    return 0.93;

  if (ECON_DOMAINS.some((d) => h === d || h.endsWith(`.${d}`))) return 0.9;

  if (PHILOSOPHY_DOMAINS.some((d) => h === d || h.endsWith(`.${d}`)))
    return 0.9;

  if (PSYCHOLOGY_DOMAINS.some((d) => h === d || h.endsWith(`.${d}`)))
    return 0.9;

  if (ENV_ALLOWED_DOMAINS.some((d) => h === d || h.endsWith(`.${d}`)))
    return 0.75;

  return 0;
}

const MIN_TRUST_SCORE = 0.75;

function buildSiteFilter() {
  if (!ALL_ALLOWED_DOMAINS.length) return "";
  return ALL_ALLOWED_DOMAINS.map((d) => `site:${d}`).join(" OR ");
}

function buildScopedQuery(userQ) {
  const base = (userQ || "").trim();
  if (!base) return "";
  if (/site:/i.test(base)) return base;

  const siteFilter = buildSiteFilter();
  if (!siteFilter) return base;

  return `${base} (${siteFilter})`;
}

/* --------- helpers FASE 2: clasificación y guardado en Mongo ----------- */

function classifySource(host) {
  if (!host) return "general";
  const h = host.toLowerCase();

  const patterns = {
    jurisprudencia: ["pj.gob", "csj", "tc.gob", "scjn", "corte", "tribunal"],
    normativa: ["boe.es", "dof.gob.mx", "elperuano.pe", "diariooficial"],
    ciencia: ["nature", "sciencedirect", "springer", "wiley", "nih", "ncbi"],
    tecnica: ["nist", "ieee.org", "acm.org", "iso.org"],
    filosofia: ["plato.stanford.edu", "iep.utm.edu", "philpapers.org"],
    psicologia: ["apa.org", "cambridge.org", "sagepub", "tandfonline"],
    economia: ["imf.org", "worldbank", "oecd.org"],
  };

  for (const [type, keys] of Object.entries(patterns)) {
    if (keys.some((k) => h.includes(k))) return type;
  }
  return "general";
}

function extractKeywords(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .split(/[^a-zA-Záéíóúñ]+/)
    .filter((w) => w.length > 4)
    .slice(0, 10);
}

async function persistKnowledge(items, query) {
  if (!items || !items.length) return;
  const normalizedQuery = normalizeText(query);

  const docs = items.map((it) => ({
    query,
    normalizedQuery,
    url: it.link,
    host: it.host,
    title: it.title,
    snippet: it.snippet,
    trustScore: it.trustScore,
    sourceType: classifySource(it.host),
    autoIndexed: true,
    keywords: extractKeywords(`${it.title || ""} ${it.snippet || ""}`),
  }));

  try {
    await LegalKnowledge.insertMany(docs, { ordered: false });
  } catch {
    // ignoramos duplicados
  }
}

/* --------------------------- /api/research/health ----------------------- */

router.get("/health", (_req, res) => {
  if (!ENABLE_RESEARCH) {
    return res.status(200).json({
      ok: true,
      enabled: false,
      hasKeys: HAS_KEYS,
      msg: "research engine ready (disabled by ENABLE_RESEARCH)",
    });
  }

  if (!HAS_KEYS) {
    return res.status(500).json({
      ok: false,
      enabled: true,
      hasKeys: false,
      error: "missing_keys",
      msg: "missing GOOGLE_API_KEY / GOOGLE_CSE_ID",
    });
  }

  return res.status(200).json({
    ok: true,
    enabled: true,
    hasKeys: true,
    msg: "research engine ready",
  });
});

/* --------------------------- /api/research/search ----------------------- */

router.get("/search", async (req, res) => {
  try {
    if (!ENABLE_RESEARCH) {
      return sendError(res, 503, {
        error: "research_disabled",
        msg: "El motor de investigación está desactivado por configuración.",
      });
    }

    if (!HAS_KEYS) {
      return sendError(res, 500, {
        error: "missing_keys",
        msg: "Faltan GOOGLE_API_KEY o GOOGLE_CSE_ID.",
      });
    }

    const qRaw = String(req.query.q || "").trim();
    const num = Math.min(
      Math.max(parseInt(req.query.num || "3", 10) || 3, 1),
      MAX_RESULTS
    );
    const lr = String(req.query.lr || "lang_es").trim();
    const start = Math.max(parseInt(req.query.start || "1", 10) || 1, 1);

    if (!qRaw) {
      return sendError(res, 400, {
        error: "missing_q",
        msg: "Debes proporcionar un parámetro de consulta 'q'.",
      });
    }

    const scopedQ = buildScopedQuery(qRaw);

    const params = new URLSearchParams();
    params.set("key", GOOGLE_API_KEY);
    params.set("cx", GOOGLE_CSE_ID);
    params.set("q", scopedQ);
    params.set("num", String(num));
    params.set("start", String(start));
    if (lr) params.set("lr", lr);

    const url = `https://www.googleapis.com/customsearch/v1?${params.toString()}`;

    const gx = await fetch(url, { method: "GET" });
    const ctype = gx.headers.get("content-type") || "";
    const isJson = ctype.includes("application/json");

    if (!gx.ok) {
      const raw = isJson
        ? await gx.json().catch(() => ({}))
        : await gx.text().catch(() => "");

      console.error("[research/search] Google error:", gx.status, raw);

      return sendError(res, gx.status, {
        error: "google_error",
        msg: `Google Custom Search devolvió un estado HTTP ${gx.status}.`,
        extra: { status: gx.status, googlePayload: raw },
      });
    }

    const data = isJson ? await gx.json() : {};
    const totalResults =
      Number(data?.searchInformation?.totalResults || 0) || 0;

    let items = (data.items || []).map((it) => {
      let sourceHost = "";
      try {
        sourceHost = new URL(it.link).hostname.replace(/^www\./, "");
      } catch {
        sourceHost = "";
      }

      const host = normalizeHost(sourceHost);
      const snippet = it.snippet || "";
      const trustScore = computeTrustScore(host, snippet);

      return {
        title: it.title,
        link: it.link,
        snippet,
        thumb:
          it.pagemap?.cse_thumbnail?.[0]?.src ||
          it.pagemap?.cse_image?.[0]?.src ||
          it.pagemap?.metatags?.[0]?.["og:image"] ||
          null,
        source: it.pagemap?.metatags?.[0]?.["og:site_name"] || host,
        host,
        trustScore,
      };
    });

    // Filtro SEC-LITIS UNIVERSAL
    items = items.filter((it) => {
      if (!it.host) return false;
      if (isBlockedHost(it.host)) return false;
      if (!isAllowedHost(it.host)) return false;
      if (typeof it.trustScore !== "number") return false;
      return it.trustScore >= MIN_TRUST_SCORE;
    });

    // 🔥 FASE 2: guardar en biblioteca interna
    await persistKnowledge(items, qRaw);

    return res.json({
      ok: true,
      q: qRaw,
      qEffective: scopedQ,
      num,
      lr,
      start,
      totalResults,
      count: items.length,
      items,
    });
  } catch (err) {
    console.error("[research/search] error inesperado:", err);
    return sendError(res, 500, {
      error: "internal_error",
      msg: "Error interno al consultar el motor de investigación.",
    });
  }
});

export default router;
