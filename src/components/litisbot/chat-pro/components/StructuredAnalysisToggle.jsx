// ============================================================================
// ⚖ StructuredAnalysisToggle — Análisis Jurídico Estructural
// ----------------------------------------------------------------------------
// - Minimalista
// - No invasivo
// - Expandible
// - Profesional e institucional
// ============================================================================
import React, { useState, useEffect } from "react";
import { FileText, Copy } from "lucide-react";

export default function StructuredAnalysisToggle({ result }) {
  const storageKey = `litisbot_structured_toggle_${result?.meta?.chatId ?? "default"}`;

  const [open, setOpen] = useState(() => {
    try {
        const stored = sessionStorage.getItem(storageKey);
        return stored === "true";
    } catch {
        return false;
    }
});
  useEffect(() => {
    try {
        sessionStorage.setItem(storageKey, open);
    } catch {
        // silencioso
    }
    }, [open, storageKey]);
  if (!result?.predictiveOutcome) return null;

  const {
    score,
    bucket,
    predictiveOutcome,
  } = result;

  const handleCopy = async () => {
    const text = buildExportText(result);
    await navigator.clipboard.writeText(text);
  };

  const handleExportWord = async () => {
  try {
    const res = await fetch("/api/export/analysis-docx", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(result),
    });

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "Analisis_Juridico_Estructural.docx";
    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Error exportando Word:", err);
  }
};

  const handleExportPDF = () => {
    window.open("/api/export/analysis-pdf", "_blank");
  };

  return (
    <div className="mt-10 border-t border-neutral-200 pt-6">

      {/* Activador minimalista */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-sm text-neutral-500 hover:text-neutral-900 transition flex items-center gap-2"
      >
        <FileText size={16} />
        Ver análisis jurídico estructural
      </button>

      {open && (
        <div className="mt-6 space-y-5 text-sm text-neutral-700">

          <div className="text-xs tracking-widest uppercase text-neutral-400">
            Análisis Jurídico Estructural
          </div>

          <div className="space-y-1">
            <div>
              Score estructural:{" "}
              <span className="font-medium">{score}</span>
            </div>
            <div>
              Probabilidad de éxito:{" "}
              <span className="font-medium">
                {(predictiveOutcome.probabilidadExito * 100).toFixed(0)}%
              </span>
            </div>
            <div>
              Nivel de riesgo:{" "}
              <span className="font-medium">
                {predictiveOutcome.nivelRiesgo}
              </span>
            </div>
            <div>
              Perfil judicial probable:{" "}
              <span className="font-medium">
                {predictiveOutcome.perfilJuezProbable}
              </span>
            </div>
          </div>

          {predictiveOutcome.factoresClave?.length > 0 && (
            <div>
              <div className="font-medium mb-1">
                Factores críticos detectados
              </div>
              <ul className="list-disc list-inside space-y-1">
                {predictiveOutcome.factoresClave.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Acciones */}
          <div className="flex gap-4 pt-4 text-xs text-neutral-500">

            <button
              onClick={handleCopy}
              className="hover:text-neutral-900 flex items-center gap-1"
            >
              <Copy size={14} />
              Copiar
            </button>

            <button
              onClick={handleExportWord}
              className="hover:text-neutral-900"
            >
              Exportar Word
            </button>

            <button
              onClick={handleExportPDF}
              className="hover:text-neutral-900"
            >
              Exportar PDF
            </button>

          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   🧾 Construcción de texto exportable
============================================================================ */

function buildExportText(result) {
  const {
    score,
    predictiveOutcome,
  } = result;

  return `
ANÁLISIS JURÍDICO ESTRUCTURAL
────────────────────────────────

Score estructural: ${score}
Probabilidad de éxito: ${(predictiveOutcome.probabilidadExito * 100).toFixed(0)}%
Nivel de riesgo: ${predictiveOutcome.nivelRiesgo}
Perfil judicial probable: ${predictiveOutcome.perfilJuezProbable}

Factores críticos:
${(predictiveOutcome.factoresClave || [])
  .map((f) => `• ${f}`)
  .join("\n")}

Modelo: ${predictiveOutcome.modeloVersion}
`.trim();
}