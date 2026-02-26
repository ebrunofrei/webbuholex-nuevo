import { classifyLegalDocument } from "./LegalDocumentClassifier.js";

export function analyzeLegalDocument(raw = "", config = { mode: "litigacion" }) {
  if (!raw || raw.length < 800) return null;

  const docType = classifyLegalDocument(raw);
  const text = raw.toUpperCase();

  const report = {
    score: 100,
    warnings: [],
    suggestions: [],
    argumentativeWeakness: [],
  };

  /* ======================================================
     1️⃣ VALIDACIÓN ESTRUCTURAL
  ====================================================== */

  if (docType === "demanda") {
    if (!text.includes("PETITORIO")) {
      report.score -= 15;
      report.warnings.push("No se identifica un petitorio claro.");
      report.suggestions.push("Incorpore una sección explícita titulada PETITORIO detallando las pretensiones concretas.");
    }

    if (!text.includes("FUNDAMENTOS")) {
      report.score -= 10;
      report.warnings.push("Faltan fundamentos diferenciados.");
      report.suggestions.push("Separe los FUNDAMENTOS DE HECHO y FUNDAMENTOS DE DERECHO.");
    }
  }

  if (docType === "apelacion") {
    if (!text.includes("AGRAVIO")) {
      report.score -= 15;
      report.warnings.push("No se desarrollan agravios específicos.");
      report.suggestions.push("Desarrolle agravios individualizados señalando error de hecho o de derecho.");
    }
  }

  if (docType === "resolucion") {
    if (!text.includes("CONSIDERANDO")) {
      report.score -= 20;
      report.warnings.push("La resolución carece de motivación estructurada.");
      report.suggestions.push("Incluya sección CONSIDERANDO antes de la parte resolutiva.");
    }
  }

  /* ======================================================
     2️⃣ DETECCIÓN DE DEBILIDAD ARGUMENTATIVA
  ====================================================== */

  // Falta nexo causal
  if (!text.match(/POR TANTO|EN CONSECUENCIA|DEBIDO A|EN VIRTUD DE/)) {
    report.score -= 10;
    report.argumentativeWeakness.push("No se aprecia nexo causal explícito entre hechos y conclusión.");
    report.suggestions.push("Incorpore conectores lógicos como 'por tanto', 'en consecuencia', 'debido a'.");
  }

  // No hay norma citada
  if (!text.match(/ART[ÍI]CULO|ART\./)) {
    report.score -= 15;
    report.argumentativeWeakness.push("No se citan normas jurídicas específicas.");
    report.suggestions.push("Fundamente la argumentación citando artículos concretos aplicables.");
  }

  // No hay motivación explícita
  if (!text.match(/SE MOTIVA|MOTIVACI[ÓO]N|RAZONAMIENTO/)) {
    report.score -= 10;
    report.argumentativeWeakness.push("No se desarrolla motivación explícita.");
    report.suggestions.push("Explique el razonamiento que conecta la norma con los hechos.");
  }

  /* ======================================================
     3️⃣ MODO REVISOR DE CORTE
  ====================================================== */

  const vagueWords = ["EVIDENTEMENTE", "CLARAMENTE", "SIN DUDA", "OBVIAMENTE"];
  vagueWords.forEach(word => {
    if (text.includes(word)) {
      report.score -= 5;
      report.argumentativeWeakness.push(`Uso potencialmente retórico del término '${word}'.`);
      report.suggestions.push(`Evite el uso de '${word}' salvo que esté objetivamente fundamentado.`);
    }
  });

  // Exceso de adjetivos evaluativos
  if (text.match(/ARBITRARIO|INJUSTO|ILEGALÍSIMO|TOTALMENTE/g)?.length > 3) {
    report.score -= 8;
    report.argumentativeWeakness.push("Posible exceso de adjetivación valorativa.");
    report.suggestions.push("Reemplace calificativos por argumentación normativa objetiva.");
  }

  /* ======================================================
     4️⃣ SCORE AJUSTE FINAL
  ====================================================== */

  if (report.score < 0) report.score = 0;

  return report;
}