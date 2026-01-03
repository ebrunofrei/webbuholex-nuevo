function getBaseURL() {
  return (import.meta?.env?.VITE_API_URL || "").replace(/\/$/, "");
}

export async function fetchAgendaRangoMongo({ usuarioId, from, to, tz="America/Lima" }) {
  const base = getBaseURL();
  const qs = new URLSearchParams({ usuarioId, from, to, tz });
  const url = `${base}/api/agenda/rango?${qs.toString()}`;
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.ok) throw new Error(data?.detail || "No se pudo cargar rango (Mongo)");
  return data.items || [];
}
