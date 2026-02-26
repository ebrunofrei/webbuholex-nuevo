import React from "react";

function scoreLabel(score = 0) {
  if (score >= 82) return "Estructura sólida";
  if (score >= 61) return "Estructura incompleta";
  return "Estructura débil";
}

export default function CourtReviewPanel({ open, onClose, data }) {
  if (!open) return null;

  const coherence = data?.coherence;
  const contradictions = data?.contradictions;

  const score = coherence?.score ?? 0;
  const label = coherence?.label || scoreLabel(score);

  const findings = coherence?.findings || [];
  const suggestions = coherence?.suggestions || [];
  const court = coherence?.courtReview;

  return (
    <div className="fixed inset-0 z-[200]">
      <div
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className="absolute right-0 top-0 h-full w-[360px] max-w-[92vw] bg-white border-l border-black/10 shadow-xl">
        <div className="h-16 px-5 flex items-center justify-between border-b border-black/10">
          <div className="font-semibold text-neutralAcad-900">
            Revisor de Corte
          </div>
          <button
            className="text-neutralAcad-400 hover:text-litis-900 transition"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>

        <div className="p-5 space-y-6 overflow-y-auto h-[calc(100%-4rem)]">
          <div className="rounded-xl border border-black/10 p-4">
            <div className="text-xs uppercase tracking-widest text-neutralAcad-400">
              Score estructural
            </div>
            <div className="mt-2 flex items-end gap-3">
              <div className="text-3xl font-semibold text-litis-900">
                {score}/100
              </div>
              <div className="text-sm text-neutralAcad-700">{label}</div>
            </div>
          </div>

          {findings.length > 0 && (
            <section className="space-y-3">
              <div className="text-xs uppercase tracking-widest text-neutralAcad-400">
                Detección de debilidad argumentativa
              </div>
              <ul className="space-y-2 text-sm text-neutralAcad-700">
                {findings.slice(0, 8).map((f, idx) => (
                  <li key={idx} className="leading-relaxed">
                    • {f}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {suggestions.length > 0 && (
            <section className="space-y-3">
              <div className="text-xs uppercase tracking-widest text-neutralAcad-400">
                Cómo corregir (sin reescribir tu escrito)
              </div>
              <ol className="space-y-2 text-sm text-neutralAcad-700">
                {suggestions.slice(0, 8).map((s, idx) => (
                  <li key={idx} className="leading-relaxed">
                    <span className="text-litis-900 font-semibold">
                      {idx + 1}.
                    </span>{" "}
                    {s}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {court?.issues?.length > 0 && (
            <section className="space-y-3">
              <div className="text-xs uppercase tracking-widest text-neutralAcad-400">
                Modo Revisor de Corte
              </div>
              <ul className="space-y-2 text-sm text-neutralAcad-700">
                {court.issues.map((x, idx) => (
                  <li key={idx}>• {x}</li>
                ))}
              </ul>
              {court.tips?.length > 0 && (
                <div className="rounded-xl bg-neutralAcad-bg border border-black/10 p-4">
                  <div className="text-xs uppercase tracking-widest text-neutralAcad-400">
                    Recomendación
                  </div>
                  <div className="mt-2 text-sm text-neutralAcad-700 leading-relaxed">
                    {court.tips[0]}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Contradicciones (aún sin embeddings en orden 1) */}
          {contradictions?.contradictions?.length > 0 && (
            <section className="space-y-3">
              <div className="text-xs uppercase tracking-widest text-neutralAcad-400">
                Tensiones internas detectadas
              </div>
              <div className="text-sm text-neutralAcad-700">
                Se detectaron {contradictions.contradictions.length} posibles
                contradicciones. (Activaremos detalle en el paso 2.)
              </div>
            </section>
          )}
        </div>
      </aside>
    </div>
  );
}