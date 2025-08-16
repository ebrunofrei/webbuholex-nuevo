import jsPDF from "jspdf";

// Backends API para SaaS
export async function generarDocumento(texto, tipo, usuarioId, pro) {
  const res = await fetch("/api/generar-documento", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texto, tipo, usuarioId, pro }),
  });
  const data = await res.json();
  if (data.url) return data.url;
  throw new Error(data.error || "No se pudo generar documento");
}

export async function fetchHistorial(usuarioId, page, pageSize) {
  const res = await fetch(`/api/historial?usuarioId=${usuarioId}&page=${page}&size=${pageSize}`);
  return await res.json();
}

export async function marcarFavorito(itemId, favorito) {
  await fetch("/api/favorito", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemId, favorito }),
  });
}

export async function upgradeToPro(usuarioId) {
  const res = await fetch("/api/upgrade-pro", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuarioId }),
  });
  const data = await res.json();
  return data.success;
}

// --- NUEVO: pagos SaaS ---

export async function pagarProPaypal(usuarioId) {
  const res = await fetch("/api/pagar-paypal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuarioId }),
  });
  const data = await res.json();
  if (data.checkoutUrl) window.location.href = data.checkoutUrl;
  return !!data.checkoutUrl;
}

// --- Descargar chat como PDF ---
export function descargarChatComoPDF(messages) {
  const doc = new jsPDF();
  const fullChat = messages
    .map(m => (m.role === "user" ? "Tú: " : m.role === "assistant" ? "LitisBot: " : "") + m.content)
    .join("\n\n");
  doc.text(fullChat, 10, 10);
  doc.save("LitisBot_chat.pdf");
}
