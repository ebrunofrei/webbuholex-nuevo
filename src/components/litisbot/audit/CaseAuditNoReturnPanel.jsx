// ============================================================================
// 🦉 CaseAuditNoReturnPanel — UX-7.5 Puntos de no retorno
// ----------------------------------------------------------------------------
// - Advertencias críticas
// - No ejecuta acciones
// - Marca límites estratégicos del caso
// ============================================================================

import React, { useEffect, useState } from "react";

export default function CaseAuditNoReturnPanel({ caseId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!caseId) return;

    let alive = true;

    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/cases/${caseId}/audit/no-return`);
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json?.error || "Error al cargar puntos de no retorno");
        }

        if (alive) setData(json.noReturn);
      } catch (err) {
        if (alive) setError(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [caseId]);

  if (loading) {
    return (
      <div className="p-4 text-xs text-gray-500">
        Evaluando puntos críticos del caso…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-xs text-red-700">
        {error}
      </div>
    );
  }

  if (!data || data.points.length === 0) {
    return (
      <div className="p-4 text-xs text-gray-400">
        No se identifican puntos de no retorno.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3 border border-red-300 rounded-lg bg-red-50">
      <h2 className="text-sm font-semibold text-red-800">
        Puntos de no retorno
      </h2>

      {data.points.map((p) => (
        <div
          key={p.id}
          className="border border-red-300 rounded p-3 bg-white"
        >
          <div className="text-sm font-medium text-red-800">
            ⚠️ {p.title}
          </div>

          <div className="text-xs text-gray-700 mt-1">
            {p.description}
          </div>

          <div className="mt-2 text-xs font-semibold text-red-700">
            Consecuencia:
          </div>
          <div className="text-xs text-red-700">
            {p.consequence}
          </div>
        </div>
      ))}
    </div>
  );
}
