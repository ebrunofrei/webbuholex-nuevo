// ============================================================================
// 🗂️ DraftsDrawer — Selector de borradores (FASE C.2.4)
// ----------------------------------------------------------------------------
// - Lista snapshots
// - Preview mínimo
// - Emite acción de rehidratación
// ============================================================================

import React, { useEffect, useState } from "react";

export default function DraftsDrawer({
  open,
  caseId,
  chatId,
  onClose,
  onSelectDraft,
}) {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !caseId) return;

    setLoading(true);
    fetch(`/api/drafts?caseId=${caseId}&chatId=${chatId || ""}`)
      .then((r) => r.json())
      .then((d) => setDrafts(d.drafts || []))
      .catch(() => setDrafts([]))
      .finally(() => setLoading(false));
  }, [open, caseId, chatId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div
        className="flex-1 bg-black/40"
        onClick={onClose}
      />

      {/* Drawer */}
      <aside className="w-full max-w-md bg-white p-4 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">
            Borradores guardados
          </h2>
          <button onClick={onClose}>✕</button>
        </div>

        {loading && (
          <div className="text-sm opacity-60">
            Cargando borradores…
          </div>
        )}

        {!loading && drafts.length === 0 && (
          <div className="text-sm opacity-60">
            No hay borradores disponibles
          </div>
        )}

        <ul className="space-y-2">
          {drafts.map((d) => (
            <li key={d.id}>
              <button
                onClick={() => onSelectDraft(d)}
                className="
                  w-full text-left
                  p-3 rounded-lg
                  border
                  hover:bg-black/5
                "
              >
                <div className="text-sm font-medium">
                  {d.meta?.trigger || "Snapshot"}
                </div>
                <div className="text-xs opacity-60">
                  {new Date(d.createdAt).toLocaleString()}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
