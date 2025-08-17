import React, { useState } from "react";

export default function HerramientaAnalizador() {
  const [file, setFile] = useState(null);
  const [resultado, setResultado] = useState("");
  const [cargando, setCargando] = useState(false);

  function handleAnalyze() {
    if (!file) return;
    setCargando(true);
    setTimeout(() => {
      setResultado(`Archivo "${file.name}" analizado: [Extracto legal simulado]`);
      setCargando(false);
    }, 1200);
  }

  return (
    <div className="py-2 flex flex-col gap-3">
      <label className="font-bold">Sube un archivo PDF, Word o audio:</label>
      <input type="file" onChange={e => setFile(e.target.files[0])} />
      <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleAnalyze} disabled={!file || cargando}>
        {cargando ? "Analizando..." : "Analizar"}
      </button>
      {resultado && (
        <div className="p-3 bg-gray-100 rounded mt-3">
          <strong>Resultado:</strong> {resultado}
        </div>
      )}
    </div>
  );
}
