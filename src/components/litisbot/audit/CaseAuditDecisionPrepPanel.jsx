// ============================================================================
// 🦉 CaseAuditDecisionPrepPanel — UX-8.0 Preparación para decisión humana
// ----------------------------------------------------------------------------
// - Síntesis final
// - No ejecuta
// - No recomienda
// - Centra responsabilidad en el humano
// ============================================================================

import React, { useEffect, useState } from "react";

export default function CaseAuditDecisionPrepPanel({ caseId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!caseId) return;

    let alive = true;

    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/cases/${caseId}/audit/decision-prep`);
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json?.error || "Error al cargar preparación");
        }

        if (alive) setData(json.decisionPrep);
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
        Preparando síntesis para decisión humana…
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

  if (!data) return null;

  return (
    <div className="p-4 border rounded-lg bg-neutral-50 dark:bg-neutral-900 space-y-3">
      <h2 className="text-sm font-semibold text-black/80 dark:text-white/80">
        Preparación para decisión humana
      </h2>

      {Object.entries(data.considerations).map(
        ([key, value]) =>
          value && (
            <div key={key} className="text-xs text-gray-700 dark:text-gray-300">
              <strong className="block capitalize">
                {key.replace(/([A-Z])/g, " $1")}
              </strong>
              <div>{value}</div>
            </div>
          )
      )}

      <div className="mt-3 text-xs italic text-gray-500">
        {data.reminder}
      </div>
    </div>
  );
}
