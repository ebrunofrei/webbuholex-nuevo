import axios from "axios";
import * as cheerio from "cheerio";

// ============================================================
// 🦉 BúhoLex | cyberProvider (WeLiveSecurity - ESET)
// Fuente: https://www.welivesecurity.com/es/
// Tema: Ciberseguridad (tipo=general, especialidad=ciberseguridad)
// Opciones soportadas:
//   - limit: nro máx. de ítems (default 12)
//   - since: Date|number(ms)|ISO (filtra por fecha >= since)
//   - q:     término a buscar en título/resumen (opcional)
//   - lang:  ignorado (fuente en ES), se mantiene por consistencia
// ============================================================

const BASE = "https://www.welivesecurity.com";
const HOME = `${BASE}/es/`;

const http = axios.create({
  timeout: 15000,
  headers: {
    // UA simple para evitar bloqueos básicos
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml",
  },
});

// Helpers -----------------------------
const toAbs = (href) => {
  if (!href) return null;
  try {
    return new URL(href, BASE).toString();
  } catch {
    return null;
  }
};

const clean = (s = "") =>
  String(s).replace(/\s+/g, " ").replace(/\u00a0/g, " ").trim();

const toDate = (v) => {
  if (!v) return null;
  try {
    const d = new Date(v);
    return isNaN(+d) ? null : d;
  } catch {
    return null;
  }
};

// Filtra por since y q
function applyFilters(items, { since, q, limit }) {
  let out = Array.isArray(items) ? items : [];

  if (since) {
    const d =
      since instanceof Date
        ? since
        : typeof since === "number"
        ? new Date(since)
        : new Date(String(since));
    if (!isNaN(+d)) {
      out = out.filter((n) => {
        const nf = toDate(n.fecha);
        return nf ? nf >= d : true;
      });
    }
  }

  if (q) {
    const needle = clean(q).toLowerCase();
    out = out.filter((n) =>
      `${n.titulo || ""} ${n.resumen || ""}`.toLowerCase().includes(needle)
    );
  }

  // Orden desc por fecha si existe
  out.sort((a, b) => (new Date(b.fecha || 0)) - (new Date(a.fecha || 0)));
  return out.slice(0, Math.max(1, limit || 12));
}

// Provider ----------------------------
export default async function fetchCyberNews(opts = {}) {
  const { limit = 12, since = null, q = null } = opts;
  const items = [];

  try {
    const { data: html } = await http.get(HOME);
    const $ = cheerio.load(html);

    // La grilla principal suele usar .article; dejamos defensivo con OR
    const cards = $(".article, article.post, .post").toArray();

    for (const el of cards) {
      if (items.length >= limit) break;

      const $el = $(el);
      const a = $el.find("h2 a, .entry-title a").first();
      const img = $el.find("img").first();

      const titulo = clean(a.text());
      const enlace = toAbs(a.attr("href"));
      const resumen = clean($el.find("p, .excerpt").first().text());
      const imagen =
        toAbs(img.attr("data-src")) ||
        toAbs(img.attr("src")) ||
        null;

      // fecha (ISO en <time datetime>, si no, intentamos parsear texto)
      const timeEl = $el.find("time").first();
      const fechaRaw = timeEl.attr("datetime") || clean(timeEl.text());
      const fecha = toDate(fechaRaw) || new Date();

      if (!enlace || !titulo) continue;

      items.push({
        id: enlace,
        titulo,
        resumen,
        contenido: "",
        fuente: "WeLiveSecurity",
        url: enlace,
        imagen,
        fecha,
        tipo: "general",
        especialidad: "ciberseguridad",
        provider: "cyberProvider",
      });
    }
  } catch (err) {
    console.warn("cyberProvider error:", err?.message || err);
  }

  return applyFilters(items, { since, q, limit });
}
