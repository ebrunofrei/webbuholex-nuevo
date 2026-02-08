// ============================================================
// 🧠 Auto título jurídico canónico (NO IA)
// - Orientado a hilos / expedientes
// - Elimina lenguaje conversacional
// - Prioriza objeto jurídico
// ============================================================

export function buildAutoTitle(texto = "") {
  if (!texto || typeof texto !== "string") {
    return "Nuevo análisis jurídico";
  }

  let t = texto.toLowerCase();

  // ----------------------------------------------------------
  // 1️⃣ Eliminar saludos y muletillas
  // ----------------------------------------------------------
  t = t
    .replace(/hola\s+litis[, ]*/g, "")
    .replace(/buen(os|as)\s+(d[ií]as|tardes|noches)[, ]*/g, "")
    .replace(/\b(hoy|ahora|empezamos|comenzamos|vamos\s+a)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!t) return "Nuevo análisis jurídico";

  // ----------------------------------------------------------
  // 2️⃣ Detectar objetos jurídicos relevantes
  // ----------------------------------------------------------
  const KEYWORDS = [
    "sentencia",
    "resolución",
    "fallo",
    "demanda",
    "apelación",
    "alimentos",
    "custodia",
    "tenencia",
    "divorcio",
    "contrato",
    "nulidad",
    "proceso",
    "expediente",
  ];

  const found = KEYWORDS.filter((k) => t.includes(k));

  // ----------------------------------------------------------
  // 3️⃣ Construir título por prioridad semántica
  // ----------------------------------------------------------
  let title = "";

  if (found.includes("sentencia")) {
    if (found.includes("alimentos")) {
      title = "Análisis de sentencia de alimentos";
    } else {
      title = "Análisis de sentencia";
    }
  } else if (found.includes("apelación")) {
    title = "Estrategia de apelación";
  } else if (found.includes("demanda")) {
    title = "Evaluación de demanda";
  } else if (found.length > 0) {
    title = `Análisis sobre ${found[0]}`;
  } else {
    // Fallback semántico corto
    const words = t.split(" ").slice(0, 5).join(" ");
    title = words;
  }

  // ----------------------------------------------------------
  // 4️⃣ Capitalización jurídica
  // ----------------------------------------------------------
  title = title.charAt(0).toUpperCase() + title.slice(1);

  return title;
}
