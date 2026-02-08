// src/components/litisbot/chat/bubble/services/pdfJurisService.js

export async function processPdfJurisContext(file) {
  if (!file) return null;

  const fd = new FormData();
  fd.append("file", file);

  const resp = await fetch("/api/pdf/juris-context", {
    method: "POST",
    body: fd,
  });

  if (!resp.ok) {
    throw new Error(`PDF context error ${resp.status}`);
  }

  const data = await resp.json();

  if (!data?.ok || !data.jurisTextoBase) {
    throw new Error("Respuesta PDF inválida");
  }

  return {
    jurisTextoBase: data.jurisTextoBase,
    meta: data.meta || {},
    filename: file.name,
  };
}
