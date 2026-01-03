// ============================================================================
// 🦉 ExportCaseModal — Decisión humana de exportación (FASE 9)
// ----------------------------------------------------------------------------
// - NO automático
// - NO silencioso
// - Exporta SOLO bajo confirmación explícita
// ============================================================================

import React from "react";

export default function ExportCaseModal({ caseId, onClose }) {
  if (!caseId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-black p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
          Exportar briefing jurídico
        </h2>

        <p className="text-sm text-gray-600 dark:text-gray-400">
          Esta acción genera un documento de lectura estratégica.
          <br />
          <strong>No sustituye criterio profesional.</strong>
        </p>

        <div className="space-y-2">
          <button
            onClick={() =>
              window.open(
                `/api/cases/${caseId}/export/word`,
                "_blank",
                "noopener,noreferrer"
              )
            }
            className="
              w-full px-4 py-2 text-sm font-medium
              bg-blue-600 text-white rounded-lg
              hover:bg-blue-700 transition
            "
          >
            📄 Exportar briefing (Word)
          </button>

          <button
            onClick={() =>
              window.open(
                `/api/cases/${caseId}/export/pdf`,
                "_blank",
                "noopener,noreferrer"
              )
            }
            className="
              w-full px-4 py-2 text-sm font-medium
              bg-gray-700 text-white rounded-lg
              hover:bg-gray-800 transition
            "
          >
            📑 Exportar briefing (PDF)
          </button>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
