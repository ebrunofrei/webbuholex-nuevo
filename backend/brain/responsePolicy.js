export function shouldOfferExport(intent) {
  return ["demanda","escrito","apelacion","casacion","contrato","informe"]
    .includes(intent?.tipo);
}

export function inferTipoDocumento(intent, texto = "") {
  if (intent?.tipo) return intent.tipo;
  if (/DEMANDA/i.test(texto)) return "Demanda";
  if (/APELACION/i.test(texto)) return "Apelacion";
  return "Borrador_LitisBot";
}

export function buildSugerencias({ intent, hasJuris, modoLitis }) {
  const s = [];
  if (shouldOfferExport(intent)) s.push("¿Lo exporto a Word o PDF?");
  if (hasJuris) s.push("¿Activo control lógico de sentencia?");
  if (modoLitis === "litigante") s.push("¿Lo adapto al formato judicial peruano?");
  return s.slice(0, 3);
}
