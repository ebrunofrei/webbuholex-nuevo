import { classifyLegalDocument } from "../LegalDocumentClassifier";

/**
 * ALRE v6 — Motor Editorial Jurídico Adaptativo
 */
export function formatUltraPremiumLegal(
  raw = "",
  config = { country: "PE", mode: "litigacion" }
) {
  if (!raw) return "";

  const docType = classifyLegalDocument(raw);
  let text = raw.trim();

  const locales = {
    PE: { sede: "CORTE SUPERIOR DE JUSTICIA", ley: "C.P.C.", dateFormat: "es-PE" },
    MX: { sede: "PODER JUDICIAL DE LA FEDERACIÓN", ley: "C.P.C.F.", dateFormat: "es-MX" },
    ES: { sede: "ADMINISTRACIÓN DE JUSTICIA", ley: "L.E.C.", dateFormat: "es-ES" },
  };

  const ctx = locales[config.country] || locales.PE;

  // =========================
  // Normalización multinivel
  // =========================

  text = text.replace(
    /^\s*(\d+(\.\d+)+)\s+(.+)$/gm,
    (_, num, __, title) => `\n### ${num} ${title.trim()}\n`
  );

  // =========================
  // Adaptación por tipo
  // =========================

  if (docType === "demanda") {
    text = text.replace(
      /^\s*SUMILLA[:\-]?\s*(.+)$/gmi,
      (_, c) => `\n> **SUMILLA**  \n> *${c.trim()}*\n`
    );

    text = text.replace(
      /^\s*(PETITORIO|PRETENSIÓN|PEDIDO)\b.*$/gmi,
      "\n---\n## PETITORIO\n"
    );
  }

  if (docType === "resolucion") {
    text = text.replace(/^\s*CONSIDERANDO\b/gmi, "\n---\n## CONSIDERANDO\n");
    text = text.replace(/^\s*RESUELVE\b/gmi, "\n***\n## RESUELVE\n");

    const fecha = new Date().toLocaleDateString(ctx.dateFormat);

    text +=
      `\n\n---\n` +
      `**FIRMADO DIGITALMENTE**  \n` +
      `${ctx.sede}  \n` +
      `Expedido el ${fecha}\n`;
  }

  if (docType === "apelacion") {
    text = text.replace(/^\s*(AGRAVIO|AGRAVIOS)\b/gmi, "\n## AGRAVIOS\n");
  }

  // =========================
  // Artículos normativos
  // =========================

  text = text.replace(
    /^\s*(Art(?:ículo|\.)?\s*\d+[\w\.\-]*)[\s.:]+(.+)$/gmi,
    (_, articulo, contenido) =>
      `\n> **${ctx.ley} – ${articulo.toUpperCase()}**  \n> ${contenido.trim()}\n`
  );

  return text;
}