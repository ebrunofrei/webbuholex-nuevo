import { useState } from "react";

export default function ExportCaseModal({ caseId, onClose }) {
  const [jurisdiction, setJurisdiction] = useState("neutral");
  const [format, setFormat] = useState("pdf");

  function handleExport() {
    const url = `/api/cases/${caseId}/export/${format}?jurisdiction=${jurisdiction}`;
    window.open(url, "_blank");
    onClose?.();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-black w-full max-w-md rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold">
          Exportar análisis jurídico
        </h2>

        {/* Jurisdicción */}
        <div>
          <label className="block text-sm mb-1">Jurisdicción</label>
          <select
            value={jurisdiction}
            onChange={(e) => setJurisdiction(e.target.value)}
            className="w-full border rounded p-2 bg-transparent"
          >
            <option value="neutral">Neutral / Universal</option>
            <option value="civil">Civil</option>
            <option value="penal">Penal</option>
            <option value="administrativo">Administrativo</option>
          </select>
        </div>

        {/* Formato */}
        <div>
          <label className="block text-sm mb-1">Formato</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="w-full border rounded p-2 bg-transparent"
          >
            <option value="pdf">PDF</option>
            <option value="word">Word</option>
          </select>
        </div>

        {/* Acciones */}
        <div className="flex justify-end gap-2 pt-4">
          <button
            onClick={onClose}
            className="px-3 py-2 text-sm border rounded"
          >
            Cancelar
          </button>

          <button
            onClick={handleExport}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
          >
            Exportar
          </button>
        </div>
      </div>
    </div>
  );
}
