// src/services/apiBase.js
// Fuente única y robusta del API_BASE (prod y dev)
const fromEnv = (import.meta.env?.VITE_API_BASE_URL || "").trim();

const fallback =
  typeof window !== "undefined" && window.location
    ? `${window.location.origin.replace(/\/+$/, "")}/api`
    : "${API_BASE}";

export const API_BASE = (fromEnv !== "" ? fromEnv : fallback).replace(/\/+$/, "");
export function joinApi(path = "") {
  const p = String(path || "");
  return p.startsWith("/") ? `${API_BASE}${p}` : `${API_BASE}/${p}`;
}
