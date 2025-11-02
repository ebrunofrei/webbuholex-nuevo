// src/constants/noticiasGeneralChips.js
/**
 * Mapeo de chips (generales) → providers y/o q.
 * - Si hay providers, tienen prioridad.
 * - Si no hay providers, se usa q (pipes = OR).
 * - Mantén claves en minúsculas para coincidir con los botones de UI.
 */
export const CHIP_MAP = {
  actualidad: { providers: [], q: "" }, // feed amplio
  "política": {
    providers: ["bbcmundo", "dw", "elpais"],
    q: "política|gobierno|congreso|elections|parlamento",
  },
  "economía": {
    providers: ["elpais", "rpp", "elcomercio"],
    q: "economía|inflación|PIB|mercado|dólar|deuda|employment",
  },
  "corrupción": {
    providers: ["elpais", "bbcmundo"],
    q: "corrupción|soborno|cohecho|integridad|transparencia",
  },
  "ciencia": {
    providers: ["sciencedaily", "bbcmundo", "dw"],
    q: "ciencia|science|investigación|descubrimiento|estudio",
  },
  "tecnología": {
    providers: ["dw", "bbcmundo"],
    q: "tecnología|tech|IA|inteligencia artificial|software|ciberseguridad",
  },
  "sociedad": {
    providers: ["bbcmundo", "elpais", "rpp"],
    q: "sociedad|comunidad|seguridad|educación|salud pública",
  },
};
