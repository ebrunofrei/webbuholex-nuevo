// ============================================================
// ðŸ¦‰ BÃšHOLEX | Normalizador universal de noticias (versiÃ³n PRO)
// ============================================================
// Convierte las distintas estructuras de scraping en un formato
// unificado compatible con MongoDB y el frontend.
// - Genera siempre resumen y contenido legibles
// - Clasifica automÃ¡ticamente la especialidad y el tipo
// - Limpia HTML, espacios, y normaliza mayÃºsculas
// ============================================================

/**
 * ðŸ§¹ Limpieza bÃ¡sica de texto HTML y espacios
 */
function limpiarTexto(txt = "") {
  if (!txt) return "";
  return txt
    .replace(/<[^>]+>/g, "") // eliminar etiquetas HTML
    .replace(/\s+/g, " ") // colapsar espacios
    .trim();
}

/**
 * ðŸ” Clasifica especialidad segÃºn palabras clave del texto
 */
export function detectEspecialidad(texto = "") {
  const lower = limpiarTexto(texto).toLowerCase();

  if (lower.includes("penal") || lower.includes("delito") || lower.includes("fiscal"))
    return "penal";
  if (lower.includes("civil") || lower.includes("contrato") || lower.includes("propiedad"))
    return "civil";
  if (lower.includes("laboral") || lower.includes("trabajador") || lower.includes("sindicato"))
    return "laboral";
  if (
    lower.includes("constitucional") ||
    lower.includes("tribunal constitucional") ||
    lower.includes("amparo")
  )
    return "constitucional";
  if (lower.includes("familiar") || lower.includes("matrimonio") || lower.includes("hijo"))
    return "familiar";
  if (
    lower.includes("administrativo") ||
    lower.includes("resoluciÃ³n") ||
    lower.includes("expediente administrativo")
  )
    return "administrativo";
  if (lower.includes("ambiental") || lower.includes("medio ambiente"))
    return "ambiental";
  if (lower.includes("registral") || lower.includes("sunarp"))
    return "registral";
  if (lower.includes("notarial"))
    return "notarial";
  if (lower.includes("tributario") || lower.includes("impuesto"))
    return "tributario";
  if (
    lower.includes("tecnologÃ­a") ||
    lower.includes("digital") ||
    lower.includes("ciber") ||
    lower.includes("internet") ||
    lower.includes("innovaciÃ³n")
  )
    return "tecnologia";

  return "general";
}

/**
 * ðŸ”¹ Normaliza una sola noticia
 * Aplica formato, limpieza y detecciÃ³n inteligente de campos.
 */
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
  // ðŸ§¼ Limpieza y seguridad bÃ¡sica
  titulo = limpiarTexto(titulo) || "Sin tÃ­tulo";
  resumen = limpiarTexto(resumen);
  contenido = limpiarTexto(contenido);

  // ðŸ§© Fallbacks inteligentes
  if (!resumen || resumen.length < 25) {
    resumen = contenido ? contenido.slice(0, 280) + "..." : "Sin resumen disponible.";
  }
  if (!contenido || contenido.length < 50) {
    contenido = resumen || "Sin contenido disponible.";
  }

  // ðŸ–¼ï¸ Imagen fallback
  if (!imagen || typeof imagen !== "string" || imagen.length < 5) {
    imagen = "/assets/default-news.jpg";
  }

  // ðŸ›ï¸ ClasificaciÃ³n automÃ¡tica del tipo (jurÃ­dica o general)
  const lowerFuente = (fuente || "").toLowerCase().trim();

  const fuentesJuridicas = [
    "poder judicial",
    "tribunal constitucional",
    "sunarp",
    "jnj",
    "gaceta jurÃ­dica",
    "legis.pe",
    "ministerio pÃºblico",
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
    "el paÃ­s",
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

  // ClasificaciÃ³n principal por fuente
  if (fuentesJuridicas.some((f) => lowerFuente.includes(f))) {
    tipo = "juridica";
  } else if (fuentesGenerales.some((f) => lowerFuente.includes(f))) {
    tipo = "general";
  } else if (!tipo) {
    // ClasificaciÃ³n secundaria por palabras clave del contenido
    const lowerContenido = `${titulo} ${resumen} ${contenido}`.toLowerCase();
    if (
      lowerContenido.includes("sentencia") ||
      lowerContenido.includes("jurisprudencia") ||
      lowerContenido.includes("resoluciÃ³n") ||
      lowerContenido.includes("fiscalÃ­a") ||
      lowerContenido.includes("magistrado")
    ) {
      tipo = "juridica";
    } else {
      tipo = "general";
    }
  }

  // âš–ï¸ Especialidad automÃ¡tica (si no viene asignada)
  const especialidadDetectada =
    especialidad && especialidad !== "general"
      ? especialidad
      : detectEspecialidad(`${titulo} ${resumen} ${contenido}`);

  return {
    id: id || url,
    titulo,
    resumen,
    contenido,
    fuente: fuente.trim() || "Fuente desconocida",
    url,
    imagen,
    fecha: fecha ? new Date(fecha) : new Date(),
    tipo,
    especialidad: especialidadDetectada,
  };
}

/**
 * ðŸ”¹ Normaliza un array completo de noticias
 */
export function normalizeNoticias(lista = []) {
  return lista
    .filter((n) => n && (n.titulo || n.url))
    .map((n) => normalizeNoticia(n));
}
