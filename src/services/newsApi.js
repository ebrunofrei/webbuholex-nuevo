// src/services/newsApi.js
function normalizeResponse(data) {
  if (!data) return { items: [], hasMore: false };
  if (Array.isArray(data)) return { items: data, hasMore: false };
  if (Array.isArray(data.items)) return { items: data.items, hasMore: !!data.hasMore };
  return { items: [], hasMore: false };
}

export async function getNoticiasGenerales() {
  const url = import.meta.env.VITE_NEWS_API_URL;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Noticias generales: ${res.status}`);
  return normalizeResponse(await res.json());
}

export async function getNoticiasJuridicas() {
  const url = import.meta.env.VITE_NEWS_JURIDICAS_API_URL;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Noticias jurídicas: ${res.status}`);
  return normalizeResponse(await res.json());
}
