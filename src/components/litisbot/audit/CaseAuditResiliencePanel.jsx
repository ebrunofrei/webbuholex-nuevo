// ============================================================================
// 🦉 CaseAuditResiliencePanel — UX-7.3 Resiliencia del caso
// ----------------------------------------------------------------------------
// - Solo lectura
// - Muestra fortalezas estructurales
// - No ejecuta acciones
// ============================================================================

import React, { useEffect, useState } from "react";

const strengthStyles = {
  media: "bg-blue-100 text-blue-800",
  alta: "bg-green-100 text-green-800",
};

export default function CaseAuditResiliencePanel({ caseId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!caseId) return;

    let alive = true;

    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/cases/${caseId}/audit/resilience`);
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json?.error || "Error al cargar resiliencia");
        }

        if (alive) setData(json.resilience);
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
        Evaluando puntos de resiliencia…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-xs text-red-600">
        {error}
      </div>
    );
  }

  if (!data || data.points.length === 0) {
    return (
      <div className="p-4 text-xs text-gray-400">
        No se identifican puntos de resiliencia relevantes.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <h2 className="text-sm font-semibold text-black/80 dark:text-white/80">
        Resiliencia del caso
      </h2>

      {data.points.map((p) => (
        <div
          key={p.id}
          className="border rounded-lg p-3 bg-white dark:bg-neutral-900"
        >
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">{p.title}</div>
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                strengthStyles[p.strength] || ""
              }`}
            >
              {p.strength}
            </span>
          </div>

          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {p.description}
          </div>

          {p.note && (
            <div className="mt-2 text-xs italic text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
              ✅ {p.note}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
