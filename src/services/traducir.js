// Servicio: traducir texto usando tu endpoint /api/traducir con particionado seguro

import { asAbsoluteUrl } from "@/utils/apiUrl";

const TRANSLATE_URL = asAbsoluteUrl("/api/traducir");
const MAX_CHUNK = 3600;    // mismo límite que usas en el modal
const MAX_TOTAL = 24000;   // tope duro para evitar payloads enormes

export async function traducirTexto(text, targetLang = "es") {
  const t = (text || "").slice(0, MAX_TOTAL);
  if (!t.trim()) return "";

  const chunks = chunk(t, MAX_CHUNK);
  const out = [];

  for (const part of chunks) {
    try {
      const resp = await fetch(TRANSLATE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: part, targetLang }),
      });
      if (!resp.ok) continue;
      const j = await resp.json();
      out.push(j?.translated || "");
    } catch {
      // si un trozo falla, seguimos con el siguiente para no romper UX
    }
  }

  return out.join("");
}

function chunk(s, size) {
  const res = [];
  for (let i = 0; i < s.length; i += size) res.push(s.slice(i, i + size));
  return res;
}
