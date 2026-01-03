// ======================================================================
// 🧠 CaseAuditStrategyPanel — Lectura estratégica del caso
// ----------------------------------------------------------------------
// - NO decide
// - NO ejecuta
// - Resume estado probatorio
// ======================================================================

import React, { useEffect, useState } from "react";

export default function CaseAuditStrategyPanel({ caseId }) {
  const [strategy, setStrategy] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!caseId) return;

    let alive = true;

    (async () => {
      try {
        const res = await fetch(`/api/cases/${caseId}/audit/strategy`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error);

        if (alive) setStrategy(data.strategy);
      } catch {
        if (alive) setStrategy(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => (alive = false);
  }, [caseId]);

  if (loading) {
    return <div className="p-4 text-sm text-gray-500">Analizando caso…</div>;
  }

  if (!strategy) {
    return (
      <div className="p-4 text-sm text-gray-400">
        No hay datos suficientes para análisis estratégico.
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-xl bg-white space-y-3">
      <h3 className="text-sm font-semibold text-gray-800">
        🧠 Lectura estratégica del caso
      </h3>

      <div className="text-xs text-gray-700">
        Eventos totales: {strategy.totalEvents}
      </div>

      <div className="flex gap-3 text-xs">
        <span className="text-green-700">🟢 {strategy.ok} sólidos</span>
        <span className="text-yellow-700">🟡 {strategy.warning} débiles</span>
        <span className="text-red-700">🔴 {strategy.critical} críticos</span>
      </div>

      <div className="mt-2 text-sm font-medium">
        {strategy.healthStatus === "stable" && (
          <span className="text-green-700">
            El caso presenta una base probatoria estable.
          </span>
        )}
        {strategy.healthStatus === "medium_risk" && (
          <span className="text-yellow-700">
            El caso tiene puntos probatorios que requieren atención.
          </span>
        )}
        {strategy.healthStatus === "high_risk" && (
          <span className="text-red-700">
            El caso presenta riesgos probatorios críticos.
          </span>
        )}
      </div>
    </div>
  );
}
