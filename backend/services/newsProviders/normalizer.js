// ============================================================
// 🦉 BúhoLex | Normalizador universal de noticias (versión PRO)
// - Coherente con _helpers.js y tus providers
// - Salida lista para MongoDB + Frontend
// ============================================================

import {
  stripHtml,
  normalizeText,
  absUrl,
  proxifyMedia,
  smartDate,
  guessLang,
} from "./_helpers.js";

/* =========================
 * Util: quitar tildes y normalizar
 * ========================= */
function norm(s = "") {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/* =========================
 * Limpieza de texto
 * ========================= */
function limpiarTexto(txt = "") {
  if (!txt) return "";
  const sinHtml = stripHtml(String(txt));
  return normalizeText(sinHtml);
}

/* =========================
 * Clasificador de especialidad (ampliado)
 * ========================= */
export function detectEspecialidad(texto = "") {
  const t = norm(limpiarTexto(texto));

  const tests = [
    ["penal", /(penal|delito|fiscal(ia)?|acusaci[oó]n|condena|sentencia penal|mp|ministerio publico)/],
    ["civil", /(civil|contrato|propiedad|obligaci[oó]n|posesi[oó]n|arrendamiento|sucesi[oó]n)/],
    ["laboral", /(laboral|trabajador|empleador|despido|sindicato|remuneraci[oó]n|sunafil|planilla)/],
    ["constitucional", /(constitucional|tribunal constitucional|tc|amparo|derechos fundamentales|habeas corpus)/],
    ["familiar", /(familia|alimentos|tenencia|violencia familiar|matrimonio|divorcio)/],
    ["administrativo", /(administrativo|resoluci[oó]n administrativa|procedimiento administrativo|tupa|osce|municipalidad)/],
    ["tributario", /(tributario|impuesto|sunat|igv|renta|arbitrios)/],
    ["comercial", /(comercial|mercantil|societario|accionista|empresa|factoring)/],
    ["procesal", /(procesal|proceso|procedimiento|cautelar|apelaci[oó]n|casaci[oó]n)/],
    ["registral", /(registral|sunarp|registro|partida|registrador)/],
    ["ambiental", /(ambiental|oeefa|eia|impacto ambiental)/],
    ["notarial", /(notarial|notario)/],
    ["penitenciario", /(penitenciario|inpe|prisi[oó]n|c[áa]rcel)/],
    ["consumidor", /(consumidor|indecopi|protecci[oó]n al consumidor)/],
    ["seguridad social", /(seguridad social|previsional|pensi[oó]n|pensiones)/],
    ["derechos humanos", /(derechos humanos|corte idh|cidh|oea|onu derechos|convencion americana)/],
    ["internacional", /(internacional|onu|oea|cij|tjue|corte internacional)/],
    ["informatico", /(inform[aá]tico|ciberseguridad|habeas data|protecci[oó]n de datos|delitos inform[aá]ticos)/],
  ];

  for (const [key, rx] of tests) if (rx.test(t)) return key;
  return "general";
}

/* =========================
 * Normalización de fuente
 * ========================= */
function fuenteToNorm(f = "") {
  let s = norm(f);
  // intenta además extraer host si viene una URL
  try {
    const h = new URL(f).hostname.replace(/^www\./i, "");
    if (h) s = norm(h);
  } catch { /* no-op */ }

  // Simplificaciones frecuentes
  s = s
    .replace(/^diario oficial\s+/, "")
    .replace(/\.pe$|\.com$|\.org$|\.net$|\.es$/g, "")
    .replace(/legispe$/, "legis")
    .replace(/^pj$/, "poder judicial")
    .replace(/^tc$/, "tribunal constitucional")
    .replace(/^elpais$/, "el pais");

  return s;
}

/* =========================
 * Clasificador de tipo (jurídica/general)
 * ========================= */
function detectarTipoPorFuente(fuente = "") {
  const f = fuenteToNorm(fuente);

  const juridicas = [
    "poder judicial", "tribunal constitucional", "sunarp", "jnj",
    "gaceta juridica", "legis", "ministerio publico", "corte suprema",
    "corte idh", "cij", "tjue", "oea", "onu noticias", "el peruano",
  ];

  const generales = [
    "bbc", "cnn", "el pais", "reuters", "guardian",
    "gnews", "newsapi", "nature", "nasa", "rpp", "andina",
  ];

  if (juridicas.some(k => f.includes(k))) return "juridica";
  if (generales.some(k => f.includes(k))) return "general";
  return ""; // desconocido
}

/* =========================
 * Normalizador principal
 * ========================= */
export function normalizeNoticia(input = {}) {
  // ---- Entrada tolerante ----
  let {
    id,
    titulo = "",
    resumen = "",
    contenido = "",
    fuente = "",
    url,
    enlace,               // alias frecuente
    imagen,
    fecha,
    tipo = "",
    especialidad = "",
    lang,
  } = input || {};

  // ---- Limpieza de textos ----
  titulo = limpiarTexto(titulo) || "Sin título";
  resumen = limpiarTexto(resumen);
  contenido = limpiarTexto(contenido);

  // Fallbacks de texto (defensas)
  if (!resumen || resumen.length < 25) {
    resumen = contenido ? `${contenido.slice(0, 280)}…` : "Sin resumen disponible.";
  }
  if (!contenido || contenido.length < 50) {
    contenido = resumen || "Sin contenido disponible.";
  }

  // ---- URL / Imagen ----
  const urlFinal = absUrl(url || enlace || "#");
  const imagenAbs = imagen ? absUrl(imagen, urlFinal) : "";
  const imagenResuelta = imagenAbs ? proxifyMedia(imagenAbs) : "";
  const imagenFinal = imagenResuelta || "/assets/default-news.jpg";

  // ---- Fuente y normalización ----
  let fuenteFinal = fuente?.trim();
  if (!fuenteFinal) {
    try {
      const host = new URL(urlFinal).hostname.replace(/^www\./i, "");
      fuenteFinal = host || "Fuente desconocida";
    } catch {
      fuenteFinal = "Fuente desconocida";
    }
  }
  const fuenteNorm = fuenteToNorm(fuenteFinal);

  // ---- Fecha → Date para Mongo ----
  const iso = smartDate(fecha);
  const fechaDate = new Date(iso);

  // ---- Idioma ----
  const langOut = (lang || guessLang(`${titulo} ${resumen}`)).toLowerCase();

  // ---- Tipo (jurídica/general) ----
  let tipoOut = tipo || detectarTipoPorFuente(fuenteFinal);
  if (!tipoOut) {
    // fallback por contenido si la fuente no decide
    const blob = norm(`${titulo} ${resumen} ${contenido}`);
    if (
      /(sentencia|jurisprudencia|resoluci[oó]n|magistrad|fiscal[ií]a|juzgado|sala suprema|casaci[oó]n)/.test(blob)
    ) {
      tipoOut = "juridica";
    } else {
      tipoOut = "general";
    }
  }

  // ---- Especialidad ----
  const especialidadOut =
    especialidad && norm(especialidad) !== "general"
      ? norm(especialidad)
      : detectEspecialidad(`${titulo} ${resumen} ${contenido}`);

  // ---- ID estable ----
  const idOut =
    id ||
    urlFinal ||
    `${fuenteNorm}-${titulo}`.slice(0, 96);

  // ---- Topes anti-bomba ----
  const cap = (s, n) => (s && s.length > n ? `${s.slice(0, n)}…` : s);
  titulo = cap(titulo, 500);
  resumen = cap(resumen, 2000);
  contenido = cap(contenido, 20000);

  // ---- Salida final (Mongo + Front) ----
  return {
    id: idOut,
    titulo,
    resumen,
    contenido,
    fuente: fuenteFinal,
    fuenteNorm,                 // 🔹 clave útil para filtros exactos
    url: urlFinal,              // 🔹 backend: usamos "url"
    enlace: urlFinal,           // 🔹 frontend legacy: "enlace"
    imagen: imagenAbs || "",    // sin proxy (por si lo quieres persistir tal cual)
    imagenResuelta: imagenFinal,// con proxy/local (directo para cards)
    fecha: fechaDate,           // 🔹 Date listo para Mongo
    tipo: tipoOut,              // "juridica" | "general"
    especialidad: especialidadOut || "general",
    lang: langOut || "es",
  };
}

/* =========================
 * Normalizar un array
 * ========================= */
export function normalizeNoticias(lista = []) {
  return (Array.isArray(lista) ? lista : [])
    .filter((n) => n && (n.titulo || n.url || n.enlace))
    .map((n) => normalizeNoticia(n));
}
