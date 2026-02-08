// ============================================================================
// 🧠 ARGUMENT METRICS ENGINE – LITISBOT (FASE B3 — R2 ENTERPRISE)
// ----------------------------------------------------------------------------
// Mide propiedades objetivas del texto argumentativo:
//
//   • Densidad argumentativa (premisas vs longitud total)
//   • Ratio premisas → conclusión
//   • Balance macroestructural
//   • Saturación de conectores lógicos
//   • Señal/Ruido jurídico
//
// No genera salida visible.
// Exclusivo para consumo interno C1 → C5.
// ============================================================================

/* ------------------------------------------------------------
   Normalización base
------------------------------------------------------------ */
function clean(t = "") {
  return String(t)
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text = "") {
  const cleaned = clean(text);
  if (!cleaned) return [];
  return cleaned.split(" ").filter(Boolean);
}

function countMatches(text = "", regex) {
  if (!text) return 0;
  const m = text.match(regex);
  return m ? m.length : 0;
}

/* ------------------------------------------------------------
   Detectores
------------------------------------------------------------ */
const PREMISE_MARKERS =
  /\b(dado que|puesto que|considerando|porque|en razón de|atendiendo a)\b/gi;

const CONCLUSION_MARKERS =
  /\b(por tanto|por lo tanto|en consecuencia|por ende|se concluye)\b/gi;

const LOGIC_CONNECTORS =
  /\b(sin embargo|no obstante|además|asimismo|por otro lado)\b/gi;

const LEGAL_SIGNAL =
  /\b(derecho|principio|norma|artículo|fundamento|precedente|ratio|jurisprudencia)\b/gi;

const NOISE_PATTERNS =
  /\b(obviamente|claramente|evidentemente|simplemente|básicamente)\b/gi;

/* ------------------------------------------------------------
   MÉTRICAS PRINCIPALES — R2 ENTERPRISE
------------------------------------------------------------ */
export function computeArgumentMetrics({ texto = "" }) {
  const text = clean(texto);
  const words = tokenize(text);
  const totalWords = words.length || 1;

  // --------------------------------------
  // 1) Densidad argumentativa (clave C1)
  // --------------------------------------
  const premiseCount = countMatches(text, PREMISE_MARKERS);
  const argumentDensity = Number((premiseCount / totalWords).toFixed(4));

  // --------------------------------------
  // 2) Ratio premisa/conclusión
  // --------------------------------------
  const conclusionCount = countMatches(text, CONCLUSION_MARKERS);
  const premiseConclusionRatio =
    conclusionCount === 0
      ? premiseCount
      : Number((premiseCount / conclusionCount).toFixed(3));

  // --------------------------------------
  // 3) Balance macroestructural
  // --------------------------------------
  const segments = text
    .split(/\.|\n|;/)
    .map((s) => clean(s))
    .filter((s) => s && s.length > 2);

  let structureBalance = 1;

  if (segments.length >= 3) {
    const avg = segments.reduce((a, b) => a + b.length, 0) / segments.length;
    const diffs = segments.map((s) => Math.abs(s.length - avg));

    const imbalance =
      diffs.reduce((a, b) => a + b, 0) / (segments.length * avg || 1);

    // Cap de protección
    structureBalance = Number((1 - Math.min(imbalance, 0.7)).toFixed(3));
  }

  // --------------------------------------
  // 4) Conectores lógicos
  // --------------------------------------
  const logicConnectorCount = countMatches(text, LOGIC_CONNECTORS);
  const logicConnectorRate = Number(
    (logicConnectorCount / totalWords).toFixed(4)
  );

  // --------------------------------------
  // 5) Señal/Ruido jurídico
  // --------------------------------------
  const legalSignalCount = countMatches(text, LEGAL_SIGNAL);
  const noiseCount = countMatches(text, NOISE_PATTERNS);

  const signalNoiseRatio =
    noiseCount === 0
      ? legalSignalCount
      : Number((legalSignalCount / noiseCount).toFixed(3));

  // --------------------------------------
  // Export final — estable para C1 → C5
  // --------------------------------------
  return {
    totalWords,
    premiseCount,
    conclusionCount,
    argumentDensity,        // 🔥 métrica central C1
    premiseConclusionRatio, // 🔥 soporte estructural
    structureBalance,       // 🔥 estabilidad macroargumental
    logicConnectorRate,
    signalNoiseRatio,

    flags: {
      lowDensity: argumentDensity < 0.15,
      noConclusions: conclusionCount === 0,
      imbalance: structureBalance < 0.45,
      weakSupport: premiseConclusionRatio < 1.2,
      noisy: signalNoiseRatio < 0.8,
    },
  };
}

export default computeArgumentMetrics;
