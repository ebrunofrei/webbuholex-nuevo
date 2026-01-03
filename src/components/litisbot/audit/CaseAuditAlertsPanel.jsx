import React, { useEffect, useState } from "react";

export default function CaseAuditAlertsPanel({ caseId }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!caseId) return;

    let alive = true;

    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/cases/${caseId}/audit/alerts`);
        const data = await res.json();
        if (alive) setAlerts(data.alerts || []);
      } catch {
        if (alive) setAlerts([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => (alive = false);
  }, [caseId]);

  if (loading) {
    return (
      <div className="text-xs text-black/50 dark:text-white/50">
        Analizando alertas estratégicas…
      </div>
    );
  }

  if (!alerts.length) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">
        🚨 Alertas estratégicas
      </h3>

      {alerts.map((a) => (
        <div
          key={a.id}
          className={`
            border rounded-lg p-3 text-sm
            ${
              a.level === "critical"
                ? "bg-red-50 border-red-200"
                : a.level === "warning"
                ? "bg-yellow-50 border-yellow-200"
                : "bg-blue-50 border-blue-200"
            }
          `}
        >
          <div className="font-medium">{a.title}</div>
          <div className="text-xs mt-1">{a.message}</div>

          {a.suggestedFocus && (
            <div className="text-xs italic mt-2 text-black/60">
              🎯 Foco sugerido: {a.suggestedFocus}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
