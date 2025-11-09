// ============================================================
// 🦉 BúhoLex | API de funcionalidad SaaS (documentos, historial, pagos)
// Usa la capa única de apiBase (sin rutas relativas /api)
// ============================================================
import jsPDF from "jspdf";
import { joinApi, fetchJSON, postJSON } from "@/services/apiBase";

/* ---------------- Documentos ---------------- */
export async function generarDocumento(texto, tipo, usuarioId, pro) {
  const data = await postJSON("/generar-documento", { texto, tipo, usuarioId, pro });
  if (data?.url) return data.url;
  throw new Error(data?.error || "No se pudo generar el documento");
}

export function generarPDFLocal(texto, nombre = "documento.pdf") {
  const doc = new jsPDF();
  doc.text(texto || "", 10, 10);
  doc.save(nombre);
}

/* ---------------- Historial / Favoritos -------------- */
export async function fetchHistorial(usuarioId, page = 1, pageSize = 20) {
  const qs = new URLSearchParams({
    usuarioId: String(usuarioId || ""),
    page: String(page),
    size: String(pageSize),
  });
  return await fetchJSON(joinApi(`/historial?${qs.toString()}`));
}

export async function marcarFavorito(itemId, favorito) {
  await postJSON("/favorito", { itemId, favorito: !!favorito });
  return true;
}

/* ---------------- Upgrade / Pagos ---------------------- */
export async function upgradeToPro(usuarioId) {
  const data = await postJSON("/upgrade-pro", { usuarioId });
  return !!data?.success;
}

export async function pagarProPaypal(usuarioId) {
  const data = await postJSON("/pagar-paypal", { usuarioId });
  if (data?.checkoutUrl) {
    window.location.href = data.checkoutUrl;
    return true;
  }
  return false;
}

/* ---------------- Health opcional ---------------------- */
export async function pingBackend() {
  try {
    const r = await fetchJSON(joinApi("/ping"), { method: "GET" }, { retries: 0, timeoutMs: 5000 });
    return !!r?.ok || true;
  } catch { return false; }
}
