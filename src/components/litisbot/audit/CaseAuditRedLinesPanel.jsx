// ============================================================================
// 🦉 CaseAuditRedLinesPanel — UX-7.6 Líneas rojas del caso
// ----------------------------------------------------------------------------
// - Advertencias absolutas
// - No ejecuta
// - No sugiere
// - Marca límites ético-jurídicos
// ============================================================================

import React, { useEffect, useState } from "react";

export default function CaseAuditRedLinesPanel({ caseId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!caseId) return;

    let alive = true;

    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/cases/${caseId}/audit/red-lines`);
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json?.error || "Error al cargar líneas rojas");
        }

        if (alive) setData(json.redLines);
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
        Delimitando líneas rojas del caso…
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

  if (!data || data.redLines.length === 0) {
    return (
      <div className="p-4 text-xs text-gray-400">
        No se detectan líneas rojas jurídicas activas.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3 border-2 border-red-400 rounded-lg bg-red-100">
      <h2 className="text-sm font-semibold text-red-900">
        Líneas rojas del caso
      </h2>

      {data.redLines.map((r) => (
        <div
          key={r.id}
          className="border border-red-400 rounded p-3 bg-white"
        >
          <div className="text-sm font-bold text-red-800">
            🚫 {r.title}
          </div>

          <div className="text-xs text-gray-800 mt-1">
            {r.description}
          </div>

          <div className="mt-2 text-xs italic text-red-700">
            Motivo: {r.reason}
          </div>
        </div>
      ))}
    </div>
  );
}
