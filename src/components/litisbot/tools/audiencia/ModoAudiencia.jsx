import React, { useState } from "react";

/**
 * ============================================================
 * 🎤 Modo Audiencia
 * ------------------------------------------------------------
 * Dominio: Audiencia / Penal / Procesal
 * Tipo: Herramienta cognitiva
 *
 * - Guía rápida para audiencias
 * - Notas en tiempo real
 * - NO decide, NO automatiza
 * ============================================================
 */

const TIPS_BASE = [
  "Solicita el uso de la palabra con respeto.",
  "Formula objeciones de manera concreta (impertinencia, irrelevancia).",
  "Registra plazos y decisiones del juez en tiempo real.",
  "Pide aclaraciones si una pregunta es ambigua.",
  "Fundamenta siempre en norma y jurisprudencia.",
];

export default function ModoAudiencia() {
  const [nota, setNota] = useState("");
  const [notas, setNotas] = useState([]);

  function agregarNota() {
    if (!nota.trim()) return;
    setNotas((n) => [...n, nota.trim()]);
    setNota("");
  }

  return (
    <div className="flex flex-col gap-4 text-[#5C2E0B]">

      <div className="font-semibold">
        Guía rápida para audiencia
      </div>

      <ul className="list-disc ml-5 text-sm">
        {TIPS_BASE.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>

      <div className="mt-3 flex flex-col gap-2">
        <label className="font-semibold">
          Nota rápida (tiempo real)
        </label>

        <textarea
          rows={2}
          className="border rounded-lg px-3 py-2"
          style={{ borderColor: "rgba(92,46,11,0.3)" }}
          placeholder="Ej. El juez concede 5 días para subsanar…"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
        />

        <button
          onClick={agregarNota}
          disabled={!nota.trim()}
          className="rounded-lg px-4 py-2 font-semibold hover:opacity-90"
          style={{ background: "#5C2E0B", color: "#fff" }}
        >
          Guardar nota
        </button>
      </div>

      {notas.length > 0 && (
        <ul className="text-sm flex flex-col gap-2 mt-2">
          {notas.map((n, i) => (
            <li
              key={i}
              className="rounded-lg border px-3 py-2 bg-[#FFF7EF]"
              style={{ borderColor: "rgba(92,46,11,0.2)" }}
            >
              📝 {n}
            </li>
          ))}
        </ul>
      )}

      <div className="text-xs text-[#5C2E0B]/70">
        ⚠️ Las notas son privadas y referenciales. En ChatPro
        pueden vincularse al expediente.
      </div>
    </div>
  );
}
