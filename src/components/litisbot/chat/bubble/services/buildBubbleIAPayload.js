// src/components/litisbot/chat/bubble/services/buildBubbleIAPayload.js

import { buildJurisPlainText } from "../utils/jurisTextBuilder";
import { resolveJurisIdentity } from "../utils/jurisIdentity";

export function buildBubbleIAPayload({
  texto,
  usuarioId,
  sessionId,
  jurisDoc,
  pdfCtx = null,
}) {
  const { jurisId, expedienteId, materia } =
    resolveJurisIdentity(jurisDoc);

  const jurisTextoBase =
    pdfCtx?.jurisTextoBase ||
    buildJurisPlainText(jurisDoc);

  const hasJurisSource =
    Boolean(jurisTextoBase || jurisId);

  const payload = {
    sessionId,
    prompt: texto,

    usuarioId: usuarioId || "invitado-burbuja",
    expedienteId,
    idioma: "es-PE",
    pais: "Perú",

    modo: hasJurisSource ? "jurisprudencia" : "general",
    ratioEngine: hasJurisSource,
    materia,
  };

  if (jurisId) payload.jurisprudenciaId = String(jurisId);
  if (jurisTextoBase) payload.jurisTextoBase = jurisTextoBase;

  if (pdfCtx?.jurisTextoBase) {
    payload.origenJuris = "pdfUsuario";
  } else if (jurisDoc) {
    payload.origenJuris = "repositorioInterno";
  }

  if (jurisDoc?.litisContext)
    payload.jurisContext = jurisDoc.litisContext;

  if (jurisDoc?.litisMeta)
    payload.jurisMeta = jurisDoc.litisMeta;

  if (jurisDoc?.litisSource)
    payload.jurisSource = jurisDoc.litisSource;

  if (jurisDoc?.litisContextId)
    payload.jurisContextId = jurisDoc.litisContextId;

  return {
    payload,
    hasJurisSource,
  };
}
