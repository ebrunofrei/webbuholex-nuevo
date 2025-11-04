// src/services/apiBase.js
const fromEnv = import.meta.env?.VITE_API_BASE_URL;

const fallback =
  typeof window !== "undefined" && window.location
    ? `${window.location.origin.replace(/\/+$/, "")}/api`
    : "http://localhost:3000/api";

export const API_BASE = (fromEnv && fromEnv.replace(/\/+$/, "")) || fallback;
