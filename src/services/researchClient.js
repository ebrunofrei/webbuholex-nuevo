// src/services/researchClient.js
import { API_BASE } from "@/services/newsApis.js";

export async function buscarEnWeb(q, tipo = "general") {
  const url = `${API_BASE}/research/search?q=${encodeURIComponent(q)}&tipo=${encodeURIComponent(tipo)}`;
  const r = await fetch(url);
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data?.ok === false) {
    const err = new Error(data?.error || `HTTP ${r.status}`);
    if (data?.code) err.code = data.code;
    throw err;
  }
  return data.results || [];
}

export async function saludResearch() {
  const r = await fetch(`${API_BASE}/research/health`);
  return r.json().catch(() => ({ enabled: false }));
}
