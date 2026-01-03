// ============================================================================
// 🦉 CaseAuditTensionsPanel — UX-7.2 Tensiones del caso
// ----------------------------------------------------------------------------
// - Solo lectura
// - No sugiere acciones
// - Visualización de puntos de quiebre jurídico
// ============================================================================

import React, { useEffect, useState } from "react";

const severityStyles = {
  baja: "bg-gray-100 text-gray-800",
  media: "bg-yellow-100 text-yellow-800",
  alta: "bg-red-100 text-red-800",
};

export default function CaseAuditTensionsPanel({ caseId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!caseId) return;

    let alive = true;

    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/cases/${caseId}/audit/tensions`);
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json?.error || "Error al cargar tensiones");
        }

        if (alive) setData(json.tensions);
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
        Analizando tensiones jurídicas…
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

  if (!data || data.tensions.length === 0) {
    return (
      <div className="p-4 text-xs text-gray-400">
        No se detectan tensiones jurídicas relevantes.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <h2 className="text-sm font-semibold text-black/80 dark:text-white/80">
        Tensiones del caso
      </h2>

      {data.tensions.map((t) => (
        <div
          key={t.id}
          className="border rounded-lg p-3 bg-white dark:bg-neutral-900"
        >
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">{t.title}</div>
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                severityStyles[t.severity] || ""
              }`}
            >
              {t.severity}
            </span>
          </div>

          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {t.description}
          </div>

          {t.note && (
            <div className="mt-2 text-xs italic text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
              ⚠️ {t.note}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
