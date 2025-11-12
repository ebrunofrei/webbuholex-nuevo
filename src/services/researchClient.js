// src/services/researchClient.js
import { API_BASE } from "./apiBase";

export async function buscarJurisprudencia({ q, num = 3, lang = "es" }) {
  const u = new URL(`${API_BASE}/api/research/search`);
  u.searchParams.set("q", q);
  u.searchParams.set("num", String(num));
  u.searchParams.set("lr", lang);

  const r = await fetch(u.toString(), { method: "GET", credentials: "omit" });
  if (!r.ok) {
    // Propaga un error legible para tu UI
    const txt = await r.text().catch(() => "");
    throw new Error(`Research ${r.status}: ${txt || r.statusText}`);
  }
  return r.json();
}
