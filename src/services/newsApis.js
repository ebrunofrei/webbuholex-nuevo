// ============================================================
// 🦉 BúhoLex | newsApis (frontend core, sin ciclos)
// - Fuente única: ./apiBase.js (relativo, sin alias)
// - Helpers estables: toQS, fetchJSON (timeout/abort), proxifyMedia
// - Exports con nombres EXACTOS usados por el resto del código
// ============================================================

import { API_BASE, joinApi } from "./apiBase.js";

// --- Config y utilidades básicas ---
export const FETCH_TIMEOUT_MS = 12_000;

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * toQS(obj) → "?a=1&b=2"
 * - Arrays → CSV ("a,b")
 * - Ignora null/undefined/""
 * - Convierte boolean a "1"/"0" para URLs más limpias
 */
export function toQS(obj = {}) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;

    if (Array.isArray(v)) {
      const csv = v.map(String).filter(Boolean).join(",");
      if (csv) p.set(k, csv);
      continue;
    }

    if (typeof v === "boolean") {
      p.set(k, v ? "1" : "0");
      continue;
    }

    p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

/**
 * joinUrl(base, path) — unión segura fuera de /api.
 * Para endpoints del backend usa preferentemente joinApi("/ruta").
 */
export function joinUrl(base, path) {
  const b = String(base || "").replace(/\/+$/, "");
  const p = String(path || "").replace(/^\/+/, "");
  return `${b}/${p}`;
}

/**
 * proxifyMedia(urlRemota) — pasa una URL remota por el proxy del backend
 * GET /media?url=...
 */
export function proxifyMedia(url) {
  if (!url) return "";
  // Si ya es absoluta http/https → proxificar
  if (/^https?:\/\//i.test(url)) {
    return `${joinApi("/media")}?url=${encodeURIComponent(url)}`;
  }
  // Si es relativa, se deja tal cual (sirve assets locales)
  return url;
}

/**
 * fetchJSON(url, opts)
 * - Timeout con AbortController (abort interno + externo encadenado)
 * - Acepta: method, headers, body, signal, timeout
 * - No fuerza Content-Type si body es FormData/Blob
 * - Devuelve {} si la respuesta no es JSON o está vacía
 * - Lanza Error con .status y .body cuando !res.ok
 */
export async function fetchJSON(
  url,
  {
    method = "GET",
    headers,
    body,
    signal,
    timeout = FETCH_TIMEOUT_MS,
  } = {}
) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new Error("timeout")), timeout);

  // Encadenar señal externa
  if (signal) {
    if (signal.aborted) ctrl.abort();
    else signal.addEventListener("abort", () => ctrl.abort(), { once: true });
  }

  try {
    const finalHeaders = { accept: "application/json", ...(headers || {}) };

    let finalBody = body;
    // Serializa objetos planos a JSON (no FormData/Blob/streams)
    if (
      body &&
      !(body instanceof FormData) &&
      !(body instanceof Blob) &&
      typeof body === "object" &&
      !("pipe" in body)
    ) {
      if (!finalHeaders["Content-Type"]) {
        finalHeaders["Content-Type"] = "application/json";
      }
      finalBody = JSON.stringify(body);
    }

    const res = await fetch(url, {
      method,
      headers: finalHeaders,
      body: finalBody,
      signal: ctrl.signal,
      redirect: "follow",
      cache: "no-store",
    });

    // Estados “vacíos” válidos
    if (res.status === 204) return {};
    if (res.status === 304) return { __notModified: true };

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      const err = new Error(`HTTP ${res.status} ${res.statusText}`);
      err.status = res.status;
      err.body = txt;
      throw err;
    }

    // Respuesta JSON tolerante
    try {
      return await res.json();
    } catch {
      return {};
    }
  } finally {
    clearTimeout(timer);
  }
}

// Re-export explícito de base para quien lo necesite
export { API_BASE, joinApi };
