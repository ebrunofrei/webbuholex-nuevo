// LegalReviewPanel.jsx
import React from "react";

export default function LegalReviewPanel({ report }) {
  if (!report) return null;

  const { coherence, contradictions, jurisprudence } = report;

  return (
    <section className="mb-8 rounded-xl border border-neutral-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-neutralAcad-900">
          Control de calidad jurídico
        </div>

        {coherence?.coherenceScore != null && (
          <div className="text-xs font-semibold text-litis-900">
            Score: {coherence.coherenceScore}/100
          </div>
        )}
      </div>

      {/* Coherencia */}
      {coherence?.issues?.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-bold uppercase tracking-widest text-neutralAcad-400">
            Observaciones
          </div>
          <ul className="mt-2 list-disc pl-5 text-sm text-neutralAcad-700 space-y-1">
            {coherence.issues.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Contradicciones */}
      {contradictions?.length > 0 && (
        <div className="mt-5">
          <div className="text-xs font-bold uppercase tracking-widest text-neutralAcad-400">
            Contradicciones internas
          </div>
          <div className="mt-2 space-y-3">
            {contradictions.slice(0, 4).map((c, i) => (
              <div key={i} className="rounded-lg border border-neutral-200 bg-neutralAcad-bg p-3">
                <div className="text-xs font-semibold text-neutralAcad-900">
                  {c.kind === "negation_conflict" ? "Conflicto por negación" : "Conflicto por absolutos"}
                </div>
                <div className="mt-2 text-sm text-neutralAcad-700">
                  <div className="mb-1">• {c.a}</div>
                  <div>• {c.b}</div>
                </div>
                <div className="mt-2 text-xs text-neutralAcad-400">{c.hint}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Jurisprudencia */}
      {jurisprudence?.matches?.length > 0 && (
        <div className="mt-5">
          <div className="text-xs font-bold uppercase tracking-widest text-neutralAcad-400">
            Coincidencias jurisprudenciales
          </div>
          <ul className="mt-2 space-y-2">
            {jurisprudence.matches.slice(0, 5).map((m, i) => (
              <li key={i} className="text-sm">
                <div className="font-semibold text-litis-900">{m.title || "Referencia"}</div>
                <div className="text-neutralAcad-700">{m.snippet || ""}</div>
                {m.cite && <div className="text-xs text-neutralAcad-400">{m.cite}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sugerencias */}
      {coherence?.suggestions?.length > 0 && (
        <div className="mt-5">
          <div className="text-xs font-bold uppercase tracking-widest text-neutralAcad-400">
            Sugerencias de mejora
          </div>
          <ul className="mt-2 list-disc pl-5 text-sm text-neutralAcad-700 space-y-1">
            {coherence.suggestions.slice(0, 6).map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}