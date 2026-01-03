import React, { useState } from "react";

/**
 * ============================================================
 * 🌍 Chat Multilingüe
 * ------------------------------------------------------------
 * Dominio: General
 * Tipo: Herramienta cognitiva
 *
 * - Cambia el idioma de interacción del chat
 * - NO traduce texto puntual
 * - Emite una instrucción al ChatPro
 * ============================================================
 */

const IDIOMAS = [
  { code: "es", label: "Español" },
  { code: "en", label: "Inglés" },
  { code: "pt", label: "Portugués" },
  { code: "fr", label: "Francés" },
  { code: "it", label: "Italiano" },
  { code: "de", label: "Alemán" },
];

export default function ChatMultilingue() {
  const [idioma, setIdioma] = useState("es");

  function aplicar() {
    window.dispatchEvent(
      new CustomEvent("litisbot:set-language", {
        detail: idioma,
      })
    );
  }

  return (
    <div className="flex flex-col gap-4 text-[#5C2E0B]">

      <label className="font-semibold">
        Idioma de interacción del chat
      </label>

      <select
        className="border rounded-lg px-3 py-2 bg-white"
        style={{ borderColor: "rgba(92,46,11,0.3)" }}
        value={idioma}
        onChange={(e) => setIdioma(e.target.value)}
      >
        {IDIOMAS.map((i) => (
          <option key={i.code} value={i.code}>
            {i.label}
          </option>
        ))}
      </select>

      <button
        onClick={aplicar}
        className="rounded-lg px-4 py-2 font-semibold hover:opacity-90"
        style={{ background: "#5C2E0B", color: "#fff" }}
      >
        Aplicar idioma
      </button>

      <div className="text-xs text-[#5C2E0B]/70">
        ℹ️ El asistente responderá en el idioma seleccionado
        a partir del siguiente mensaje.
      </div>
    </div>
  );
}
