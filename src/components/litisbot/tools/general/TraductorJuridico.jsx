import React, { useState } from "react";

/**
 * ============================================================
 * 🌐 Traductor Jurídico
 * ------------------------------------------------------------
 * Dominio: General / Jurídico
 * Tipo: Herramienta determinística
 *
 * Traduce textos jurídicos manteniendo
 * estructura y precisión semántica.
 * ============================================================
 */

const IDIOMAS = [
  { code: "en", label: "Inglés" },
  { code: "fr", label: "Francés" },
  { code: "pt", label: "Portugués" },
  { code: "it", label: "Italiano" },
  { code: "de", label: "Alemán" },
];

export default function TraductorJuridico() {
  const [texto, setTexto] = useState("");
  const [idioma, setIdioma] = useState("en");
  const [resultado, setResultado] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function traducir() {
    if (!texto.trim()) return;

    setCargando(true);
    setResultado("");
    setError("");

    try {
      const res = await fetch(
        "https://api.mymemory.translated.net/get?q=" +
          encodeURIComponent(texto) +
          `&langpair=es|${idioma}`
      );
      const data = await res.json();

      const traducido =
        data?.responseData?.translatedText ||
        "No se pudo obtener traducción.";

      setResultado(traducido);
    } catch (err) {
      setError("Error al traducir el texto. Intenta nuevamente.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 text-[#5C2E0B]">

      {/* TEXTO ORIGEN */}
      <div className="flex flex-col gap-2">
        <label className="font-semibold">Texto jurídico en español</label>
        <textarea
          rows={4}
          className="border rounded-lg px-3 py-2 resize-none"
          style={{ borderColor: "rgba(92,46,11,0.3)" }}
          placeholder="Escribe o pega el texto legal aquí…"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
      </div>

      {/* IDIOMA DESTINO */}
      <div className="flex flex-col gap-2">
        <label className="font-semibold">Idioma de destino</label>
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
      </div>

      {/* BOTÓN */}
      <button
        onClick={traducir}
        disabled={cargando || !texto.trim()}
        className={`
          rounded-lg px-4 py-2 font-semibold
          ${cargando ? "opacity-60" : "hover:opacity-90"}
        `}
        style={{
          background: "#5C2E0B",
          color: "#fff",
        }}
      >
        {cargando ? "Traduciendo…" : "Traducir"}
      </button>

      {/* RESULTADO */}
      {resultado && (
        <div
          className="rounded-xl border p-4 bg-[#FFF7EF]"
          style={{ borderColor: "rgba(92,46,11,0.2)" }}
        >
          <div className="font-semibold mb-2">Traducción</div>
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {resultado}
          </div>
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div className="text-sm text-red-700">
          {error}
        </div>
      )}

      {/* NOTA */}
      <div className="text-xs text-[#5C2E0B]/70 leading-relaxed">
        ⚠️ Traducción referencial. Para documentos oficiales,
        se recomienda revisión por traductor certificado.
      </div>
    </div>
  );
}
