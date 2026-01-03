export async function cargarDraftAnalisis({ caseId, chatId }) {
  const res = await fetch("/api/draft/load", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ caseId, chatId }),
  });

  if (!res.ok) {
    throw new Error("No se pudo cargar el borrador");
  }

  return res.json();
}
