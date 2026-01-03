// ============================================================================
// 🦉 CaseAuditScenarioPanel — UX-7.1
// ----------------------------------------------------------------------------
// - Simulación comparativa
// - No predictiva
// - Lectura estratégica del caso
// ============================================================================

import React, { useEffect, useState } from "react";

export default function CaseAuditScenarioPanel({ caseId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!caseId) return;

    let alive = true;

    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/cases/${caseId}/audit/scenarios`);
        const json = await res.json();
        if (alive && res.ok) setData(json);
      } catch {
        if (alive) setData(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => (alive = false);
  }, [caseId]);

  if (loading) {
    return (
      <div className="p-4 text-sm text-gray-500">
        Analizando escenarios jurídicos…
      </div>
    );
  }

  if (!data || !data.scenarios) return null;

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-semibold text-black/80 dark:text-white/80">
        Simulación comparativa de escenarios
      </h3>

      <p className="text-xs opacity-60">{data.disclaimer}</p>

      {data.scenarios.map((s) => (
        <div
          key={s.key}
          className="border rounded-xl p-3 bg-white dark:bg-black"
        >
          <h4 className="font-medium text-sm">{s.title}</h4>
          <p className="text-xs mt-1 opacity-70">{s.description}</p>

          <div className="mt-2 text-xs">
            <strong>Supuestos:</strong>
            <ul className="list-disc ml-4">
              {s.assumptions?.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}
