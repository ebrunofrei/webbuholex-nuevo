// src/components/litisbot/chat/bubble/utils/buildJurisPlainText.js

export function buildJurisPlainText(doc) {
  if (!doc || typeof doc !== "object") return "";

  const partes = [];

  if (doc.titulo || doc.nombre) {
    partes.push(`TÍTULO: ${doc.titulo || doc.nombre}`);
  }

  if (doc.numeroExpediente || doc.numero) {
    partes.push(`EXPEDIENTE: ${doc.numeroExpediente || doc.numero}`);
  }

  if (doc.sala || doc.organo || doc.salaSuprema) {
    partes.push(
      `ÓRGANO / SALA: ${doc.sala || doc.organo || doc.salaSuprema}`
    );
  }

  if (doc.especialidad || doc.materia) {
    partes.push(
      `ESPECIALIDAD / MATERIA: ${doc.especialidad || doc.materia}`
    );
  }

  if (doc.fechaResolucion || doc.fecha) {
    partes.push(`FECHA: ${doc.fechaResolucion || doc.fecha}`);
  }

  if (doc.fuente) {
    partes.push(`FUENTE: ${doc.fuente}`);
  }

  if (doc.sumilla) {
    partes.push(`SUMILLA:\n${doc.sumilla}`);
  }

  if (doc.resumen) {
    partes.push(`RESUMEN:\n${doc.resumen}`);
  }

  if (doc.litisContext) {
    partes.push(
      `CONTEXTO SELECCIONADO PARA ANÁLISIS:\n${doc.litisContext}`
    );
  }

  if (doc.litisMeta && typeof doc.litisMeta === "object") {
    const metaLines = [];
    for (const [k, v] of Object.entries(doc.litisMeta)) {
      if (v == null || v === "") continue;
      metaLines.push(`${k}: ${v}`);
    }
    if (metaLines.length) {
      partes.push(
        `METADATOS DE LA RESOLUCIÓN:\n${metaLines.join("\n")}`
      );
    }
  }

  return partes.join("\n\n").trim();
}
