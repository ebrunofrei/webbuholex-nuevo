// backend/brain/sciences/detector.js
// ============================================================
// 🎯 DETECTOR AUTOMÁTICO DE CIENCIAS AUXILIARES
// ------------------------------------------------------------
// Lee el texto de la consulta y determina qué ciencias auxiliares
// deben activarse. Devuelve un array con claves reconocidas por
// buildSciencesPrompt().
// ============================================================

const SCIENCE_KEYWORDS = {
  contabilidad_financiera: [
    "factura", "recibo", "balance", "flujo de caja", "asiento",
    "ingreso", "egreso", "comprobante", "tributación",
    "igv", "renta", "proveedor", "estado financiero"
  ],

  contabilidad_gubernamental: [
    "siaf", "seace", "osce", "pdp", "certificación presupuestal",
    "compromiso presupuestal", "ejecución presupuestal",
    "informes de control", "contraloría", "rendir cuentas",
    "expediente de contratación", "gasto público"
  ],

  auditoria: [
    "control interno", "auditoría", "perjuicio económico",
    "valoración de daños", "responsabilidad funcional",
    "hallazgo", "informe de control", "contraloría general"
  ],

  criminalistica: [
    "cadena de custodia", "huella", "escena del crimen",
    "indicios", "rastros", "pericia criminalística",
    "balística", "grafotecnia", "planimetría"
  ],

  medicina_legal: [
    "certificado médico legal", "lesiones", "incapacidad",
    "tiempo de atención", "mecanismo de lesión",
    "agresión", "autopsia", "necropsia"
  ],

  psicologia_forense: [
    "pericia psicológica", "daño emocional", "credibilidad",
    "victima", "agresor", "trauma", "evaluación psicológica",
    "test proyectivo", "coherencia narrativa"
  ],

  informatica_forense: [
    "pericia informática", "análisis forense",
    "archivo digital", "metadatos", "correo electrónico",
    "registro de accesos", "ip", "log", "dispositivo",
    "computadora", "ciberataque"
  ],

  ciberseguridad: [
    "phishing", "hackeo", "vulnerabilidad", "malware",
    "suplantación", "ataque", "autenticación",
    "seguridad informática"
  ],

  estadistica: [
    "muestra", "probabilidad", "porcentaje",
    "intervalo de confianza", "riesgo estadístico",
    "estadística", "tasa", "incidencia"
  ],

  sociologia: [
    "contexto social", "dinámica social", "criminalidad",
    "patrón de conducta", "desigualdad", "colectivo",
    "factores sociales"
  ]
};

// ============================================================
// 🔍 FUNCIÓN PRINCIPAL
// ============================================================

export function detectSciencesFromText(text = "") {
  if (!text || typeof text !== "string") return [];

  const lower = text.toLowerCase();
  const results = new Set();

  for (const [science, words] of Object.entries(SCIENCE_KEYWORDS)) {
    for (const w of words) {
      if (lower.includes(w)) {
        results.add(science);
        break;
      }
    }
  }

  // Siempre devolvemos un array (orden alfabético por consistencia)
  return Array.from(results).sort();
}

// ============================================================
// 🎯 FUTURA EXPANSIÓN (PDFs, metadata, adjuntos, etc.)
// ============================================================
//
// export async function detectSciencesFromFiles(files) {
//   // Analizar PDFs, imágenes, metadatos, etc.
//   return [];
// }
//
// ============================================================
export default detectSciencesFromText;
