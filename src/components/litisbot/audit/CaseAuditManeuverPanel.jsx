// ============================================================================
// 🦉 CaseAuditManeuverPanel — UX-7.4 Zonas de maniobra estratégica
// ----------------------------------------------------------------------------
// - Lectura estructural
// - No ejecuta acciones
// - No recomienda decisiones
// ============================================================================

import React, { useEffect, useState } from "react";

const levelStyles = {
  amplia: "bg-green-100 text-green-800",
  limitada: "bg-yellow-100 text-yellow-800",
};

export default function CaseAuditManeuverPanel({ caseId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!caseId) return;

    let alive = true;

    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/cases/${caseId}/audit/maneuvers`);
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json?.error || "Error al cargar maniobras");
        }

        if (alive) setData(json.maneuvers);
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
        Analizando zonas de maniobra…
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

  if (!data || data.zones.length === 0) {
    return (
      <div className="p-4 text-xs text-gray-400">
        No se detectan zonas de maniobra jurídica.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <h2 className="text-sm font-semibold text-black/80 dark:text-white/80">
        Zonas de maniobra estratégica
      </h2>

      {data.zones.map((z) => (
        <div
          key={z.id}
          className="border rounded-lg p-3 bg-white dark:bg-neutral-900"
        >
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">
              {z.title}
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                levelStyles[z.level] || ""
              }`}
            >
              {z.level}
            </span>
          </div>

          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {z.description}
          </div>

          {z.note && (
            <div className="mt-2 text-xs italic text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-1">
              ℹ️ {z.note}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
