// ============================================================
// 🦉 BÚHOLEX | Normalizador universal de noticias (versión PRO - Frontend)
// ============================================================
// Convertimos entradas heterogéneas en un formato unificado para el UI.
// - Genera siempre resumen/contenido legibles
// - Clasifica automáticamente tipo (jurídica/general) y especialidad
// - Limpia HTML, espacios y normaliza mayúsculas
// ============================================================

/** 🧹 Limpieza básica de texto HTML y espacios */
function limpiarTexto(txt = "") {
  if (!txt) return "";
  return txt
    .replace(/<[^>]+>/g, "")      // elimina etiquetas HTML
    .replace(/\s+/g, " ")         // colapsa espacios
    .trim();
}

/** 🔍 Clasifica especialidad según palabras clave */
export function detectEspecialidad(texto = "") {
  const lower = limpiarTexto(texto).toLowerCase();

  if (lower.includes("penal") || lower.includes("delito") || lower.includes("fiscal")) return "penal";
  if (lower.includes("civil") || lower.includes("contrato") || lower.includes("propiedad")) return "civil";
  if (lower.includes("laboral") || lower.includes("trabajador") || lower.includes("sindicato")) return "laboral";
  if (lower.includes("constitucional") || lower.includes("tribunal constitucional") || lower.includes("amparo")) return "constitucional";
  if (lower.includes("familiar") || lower.includes("matrimonio") || lower.includes("hijo")) return "familiar";
  if (lower.includes("administrativo") || lower.includes("resolución") || lower.includes("expediente administrativo")) return "administrativo";
  if (lower.includes("ambiental") || lower.includes("medio ambiente")) return "ambiental";
  if (lower.includes("registral") || lower.includes("sunarp")) return "registral";
  if (lower.includes("notarial")) return "notarial";
  if (lower.includes("tributario") || lower.includes("impuesto")) return "tributario";
  if (lower.includes("tecnología") || lower.includes("digital") || lower.includes("ciber") || lower.includes("internet") || lower.includes("innovación")) return "tecnologia";

  return "general";
}

/** 🔹 Normaliza una noticia */
export function normalizeNoticia({
  id,
  titulo = "",
  resumen = "",
  contenido = "",
  fuente = "",
  url = "#",
  imagen = null,
  fecha = null,
  tipo = "",
  especialidad = "",
} = {}) {
  // 🧼 Limpieza
  titulo = limpiarTexto(titulo) || "Sin título";
  resumen = limpiarTexto(resumen);
  contenido = limpiarTexto(contenido);

  // 🧩 Fallbacks
  if (!resumen || resumen.length < 25) {
    resumen = contenido ? contenido.slice(0, 280) + "..." : "Sin resumen disponible.";
  }
  if (!contenido || contenido.length < 50) {
    contenido = resumen || "Sin contenido disponible.";
  }

  // 🖼️ Imagen fallback
  if (!imagen || typeof imagen !== "string" || imagen.length < 5) {
    imagen = "/assets/default-news.jpg";
  }

  // 🏛️ Clasificación de tipo
  const lowerFuente = (fuente || "").toLowerCase().trim();

  const fuentesJuridicas = [
    "poder judicial",
    "tribunal constitucional",
    "sunarp",
    "jnj",
    "gaceta jurídica",
    "legis.pe",
    "ministerio público",
    "corte suprema",
    "corte idh",
    "cij",
    "tjue",
    "oea",
    "onu noticias",
    "diario oficial el peruano",
  ];

  const fuentesGenerales = [
    "bbc",
    "cnn",
    "el país",
    "reuters",
    "science news",
    "cybersecurity",
    "techcrunch",
    "gnews",
    "newsapi",
    "nature",
    "nasa",
    "guardian",
  ];

  if (fuentesJuridicas.some((f) => lowerFuente.includes(f))) {
    tipo = "juridica";
  } else if (fuentesGenerales.some((f) => lowerFuente.includes(f))) {
    tipo = "general";
  } else if (!tipo) {
    const lowerContenido = `${titulo} ${resumen} ${contenido}`.toLowerCase();
    if (
      lowerContenido.includes("sentencia") ||
      lowerContenido.includes("jurisprudencia") ||
      lowerContenido.includes("resolución") ||
      lowerContenido.includes("fiscalía") ||
      lowerContenido.includes("magistrado")
    ) {
      tipo = "juridica";
    } else {
      tipo = "general";
    }
  }

  // ⚖️ Especialidad automática
  const especialidadDetectada =
    especialidad && especialidad !== "general"
      ? especialidad
      : detectEspecialidad(`${titulo} ${resumen} ${contenido}`);

  return {
    id: id || url,
    titulo,
    resumen,
    contenido,
    fuente: (fuente || "").trim() || "Fuente desconocida",
    url,
    imagen,
    fecha: fecha ? new Date(fecha) : new Date(),
    tipo,
    especialidad: especialidadDetectada,
  };
}

/** 🔹 Normaliza un array de noticias */
export function normalizeNoticias(lista = []) {
  return (lista || [])
    .filter((n) => n && (n.titulo || n.url))
    .map((n) => normalizeNoticia(n));
}
