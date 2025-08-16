import React, { useState } from "react";

export default function HerramientaTraducir() {
  const [texto, setTexto] = useState("");
  const [idioma, setIdioma] = useState("en");
  const [resultado, setResultado] = useState("");
  const [cargando, setCargando] = useState(false);

  async function traducir() {
    if (!texto) return;
    setCargando(true);
    try {
      const res = await fetch(
        "https://api.mymemory.translated.net/get?q=" +
        encodeURIComponent(texto) + `&langpair=es|${idioma}`
      );
      const data = await res.json();
      setResultado(data?.responseData?.translatedText || "(sin traducción)");
    } catch {
      setResultado("Error de traducción");
    }
    setCargando(false);
  }

  return (
    <div className="py-2 flex flex-col gap-3">
      <label className="font-bold">Texto a traducir:</label>
      <textarea className="border rounded p-1" rows={2} value={texto} onChange={e => setTexto(e.target.value)} placeholder="Escribe el texto aquí..." />
      <div className="flex items-center gap-2">
        <label>Idioma:</label>
        <select className="border p-1 rounded" value={idioma} onChange={e => setIdioma(e.target.value)}>
          <option value="en">Inglés</option>
          <option value="fr">Francés</option>
          <option value="pt">Portugués</option>
          <option value="it">Italiano</option>
          <option value="de">Alemán</option>
        </select>
        <button className="px-4 py-2 bg-blue-700 text-white rounded" onClick={traducir} disabled={cargando || !texto}>
          {cargando ? "Traduciendo..." : "Traducir"}
        </button>
      </div>
      {resultado && (
        <div className="p-3 bg-gray-100 rounded mt-2">
          <strong>Resultado:</strong> {resultado}
        </div>
      )}
    </div>
  );
}
