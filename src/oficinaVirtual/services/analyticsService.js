// src/oficinaVirtual/services/analyticsService.js
export async function getResumenAnalyticsOficina({ signal } = {}) {
  // ✅ Namespace de Oficina Virtual (evita choque con portal/admin)
  const res = await fetch("/api/oficina/analytics/resumen", { signal });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Analytics error ${res.status}: ${txt || "sin detalle"}`);
  }

  return res.json();
}
