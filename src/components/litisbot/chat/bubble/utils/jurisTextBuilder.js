// src/components/litisbot/chat/bubble/utils/jurisTextBuilder.js

export function buildJurisPlainText(doc) {
  if (!doc || typeof doc !== "object") return "";

  const parts = [];

  if (doc.titulo || doc.nombre) {
    parts.push(`TÍTULO: ${doc.titulo || doc.nombre}`);
  }

  if (doc.numeroExpediente || doc.expediente || doc.numero) {
    parts.push(
      `EXPEDIENTE: ${
        doc.numeroExpediente || doc.expediente || doc.numero
      }`
    );
  }

  if (doc.sala || doc.organo || doc.salaSuprema) {
    parts.push(
      `ÓRGANO / SALA: ${doc.sala || doc.organo || doc.salaSuprema}`
    );
  }

  if (doc.especialidad || doc.materia) {
    parts.push(
      `MATERIA: ${doc.especialidad || doc.materia}`
    );
  }

  if (doc.fechaResolucion || doc.fecha) {
    parts.push(
      `FECHA: ${doc.fechaResolucion || doc.fecha}`
    );
  }

  if (doc.sumilla) {
    parts.push(`SUMILLA:\n${doc.sumilla}`);
  }

  if (doc.resumen) {
    parts.push(`RESUMEN:\n${doc.resumen}`);
  }

  if (doc.litisContext) {
    parts.push(
      `CONTEXTO SELECCIONADO PARA ANÁLISIS:\n${doc.litisContext}`
    );
  }

  if (doc.litisMeta && typeof doc.litisMeta === "object") {
    const metaLines = Object.entries(doc.litisMeta)
      .filter(([, v]) => v != null && v !== "")
      .map(([k, v]) => `${k}: ${v}`);

    if (metaLines.length) {
      parts.push(
        `METADATOS DE LA RESOLUCIÓN:\n${metaLines.join("\n")}`
      );
    }
  }

  return parts.join("\n\n").trim();
}
