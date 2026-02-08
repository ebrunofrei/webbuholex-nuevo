// ============================================================================
// 🌐 apiClient — Canonical HTTP Client (R7.7++)
// ----------------------------------------------------------------------------
// - Absolute URLs only (VITE_API_BASE)
// - No /api/api bugs
// - HTML-safe (never leaks <!doctype>)
// - JSON-only contract
// - Mobile-first + production hardened
// ============================================================================

const API_BASE = (import.meta.env.VITE_API_BASE || "http://localhost:3000/api")
  .replace(/\/+$/, ""); // trim trailing slash

const REQUEST_TIMEOUT_MS = 45_000;

// ------------------------------------------------------------
// Utils
// ------------------------------------------------------------
const looksLikeHTML = (t) => /^<!DOCTYPE html>|<html/i.test(t || "");

function debug(...args) {
  if (import.meta.env?.DEV) {
    console.log("🌐 [apiClient]", ...args);
  }
}

// ------------------------------------------------------------
// Core request
// ------------------------------------------------------------
async function request(path, options = {}) {
  const cleanPath = String(path || "").replace(/^\/+/, "");
  const url = `${API_BASE}/${cleanPath}`;

  debug("→", options.method || "GET", url);

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  );

  let res;

  try {
    res = await fetch(url, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      signal: controller.signal,
      ...options,
    });
  } catch (err) {
    clearTimeout(timeout);
    debug("NETWORK ERROR:", err);
    throw new Error("No se pudo conectar con el servidor.");
  }

  clearTimeout(timeout);

  const contentType = res.headers.get("content-type") || "";

  // Non-JSON → block immediately
  if (!contentType.includes("application/json")) {
    const text = await res.text();

    if (looksLikeHTML(text)) {
      debug("❌ HTML response blocked");
      throw new Error("Respuesta inválida del servidor.");
    }

    throw new Error(text || `HTTP ${res.status}`);
  }

  let data;
  try {
    data = await res.json();
  } catch (err) {
    debug("❌ JSON parse error:", err);
    throw new Error("Respuesta JSON inválida del servidor.");
  }

  if (!res.ok) {
    throw new Error(data?.error || `HTTP ${res.status}`);
  }

  return data;
}

// ------------------------------------------------------------
// Public API
// ------------------------------------------------------------
export default {
  get: (path, params = null) => {
    let finalPath = path;

    if (params && typeof params === "object") {
      const qp = new URLSearchParams(params).toString();
      finalPath = qp ? `${path}?${qp}` : path;
    }

    return request(finalPath);
  },

  post: (path, body) =>
    request(path, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  patch: (path, body) =>
    request(path, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  delete: (path) =>
    request(path, {
      method: "DELETE",
    }),
};
