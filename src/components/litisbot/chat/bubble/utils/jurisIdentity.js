// src/components/litisbot/chat/bubble/utils/jurisIdentity.js

export function resolveJurisIdentity(doc) {
  if (!doc || typeof doc !== "object") {
    return {
      jurisId: null,
      expedienteId: null,
      materia: "general",
    };
  }

  const jurisId =
    doc._id ||
    doc.id ||
    doc.jurisprudenciaId ||
    null;

  const expedienteId =
    doc.numeroExpediente ||
    doc.expediente ||
    jurisId ||
    `juris-${Date.now()}`;

  const materia =
    doc.especialidad ||
    doc.materia ||
    "general";

  return {
    jurisId,
    expedienteId,
    materia,
  };
}
