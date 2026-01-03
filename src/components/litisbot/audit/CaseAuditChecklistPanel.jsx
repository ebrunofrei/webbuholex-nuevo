// ============================================================================
// 🦉 CaseAuditChecklistPanel — UX-7.0
// ----------------------------------------------------------------------------
// - Checklist estratégico
// - No ejecuta acciones
// - No decide
// - Prepara al litigante
// ============================================================================

import React, { useEffect, useState } from "react";

export default function CaseAuditChecklistPanel({ caseId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!caseId) return;

    let alive = true;

    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/cases/${caseId}/audit/checklist`);
        const data = await res.json();

        if (alive && res.ok) {
          setItems(data.checklist || []);
        }
      } catch {
        if (alive) setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => (alive = false);
  }, [caseId]);

  if (loading) {
    return (
      <div className="p-4 text-sm text-gray-500">
        Generando checklist estratégico…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-400">
        No hay pendientes estratégicos detectados.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <h3 className="text-sm font-semibold text-black/80 dark:text-white/80">
        Checklist de preparación estratégica
      </h3>

      {items.map((item, i) => (
        <div
          key={i}
          className="border rounded-lg p-3 text-sm bg-white dark:bg-black"
        >
          <div className="flex justify-between">
            <span className="font-medium">{item.message}</span>
            <span className="text-xs opacity-60">
              prioridad {item.priority}
            </span>
          </div>

          <div className="mt-1 text-xs opacity-60">
            categoría: {item.category}
          </div>
        </div>
      ))}
    </div>
  );
}
