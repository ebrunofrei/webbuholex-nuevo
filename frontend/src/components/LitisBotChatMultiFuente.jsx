import React, { useState, useEffect } from "react";
import { FaStar, FaRegStar, FaSpinner, FaHistory } from "react-icons/fa";

const FUENTES = [
  { key: "legis.pe", label: "Legis.pe" },
  { key: "SPIJ", label: "SPIJ" },
  { key: "elperuano.pe", label: "El Peruano" },
  { key: "actualidadlegal.pe", label: "Actualidad Legal" },
];

function getFavoritosLS() {
  try { return JSON.parse(localStorage.getItem("fuentesFavoritas")) || []; }
  catch { return []; }
}
function setFavoritosLS(favoritos) {
  localStorage.setItem("fuentesFavoritas", JSON.stringify(favoritos));
}
function getHistorialLS() {
  try { return JSON.parse(localStorage.getItem("litisbotHistorial")) || []; }
  catch { return []; }
}
function setHistorialLS(historial) {
  localStorage.setItem("litisbotHistorial", JSON.stringify(historial));
}

export default function LitisBotChatMultiFuente() {
  const [input, setInput] = useState("");
  const [consulta, setConsulta] = useState("");
  const [resultados, setResultados] = useState({});
  const [loading, setLoading] = useState({});
  const [errores, setErrores] = useState({});
  const [favoritos, setFavoritos] = useState(getFavoritosLS());
  const [historial, setHistorial] = useState(getHistorialLS());
  const [showHistorial, setShowHistorial] = useState(false);

  // --- UX: cuando cambia la consulta, busca en todas las fuentes ---
  useEffect(() => {
    if (!consulta) return;
    setResultados({});
    setErrores({});
    FUENTES.forEach(fuente => {
      setLoading(l => ({ ...l, [fuente.key]: true }));
      setErrores(e => ({ ...e, [fuente.key]: null }));
      fetch("/api/buscar-fuente-legal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consulta, fuentesPreferidas: [fuente.key] })
      })
        .then(r => r.json())
        .then(data => {
          setResultados(res => ({
            ...res,
            [fuente.key]: (data.resultado || []).filter(f => f.fuente === fuente.key)
          }));
        })
        .catch(() => setErrores(e => ({ ...e, [fuente.key]: "No disponible" })))
        .finally(() => setLoading(l => ({ ...l, [fuente.key]: false })));
    });

    // Historial
    if (!historial.includes(consulta)) {
      const newHist = [consulta, ...historial].slice(0, 15);
      setHistorial(newHist);
      setHistorialLS(newHist);
    }
    // eslint-disable-next-line
  }, [consulta]);

  // Favoritos persistentes
  useEffect(() => {
    setFavoritosLS(favoritos);
  }, [favoritos]);

  // Submit consulta
  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setConsulta(input.trim());
    setInput("");
  };

  // Toggle favorito
  const toggleFavorito = fuenteKey => {
    setFavoritos(favs =>
      favs.includes(fuenteKey)
        ? favs.filter(f => f !== fuenteKey)
        : [...favs, fuenteKey]
    );
  };

  // Repetir consulta desde historial
  const repetirConsulta = pregunta => {
    setConsulta(pregunta);
    setInput("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-[#b03a1a]/40 via-white to-[#b03a1a]/40 flex flex-col items-center px-2 py-8">
      <div className="bg-white max-w-3xl w-full rounded-2xl shadow-lg p-6 flex flex-col items-center">
        {/* Título y historial */}
        <div className="flex w-full items-center mb-4">
          <span className="text-2xl md:text-3xl font-extrabold text-[#b03a1a] flex-1">LitisBot Multifuente</span>
          <button
            className="ml-2 bg-gray-100 hover:bg-yellow-100 rounded-full p-2"
            onClick={() => setShowHistorial(v => !v)}
            title="Ver historial de consultas"
          >
            <FaHistory className="text-xl text-[#b03a1a]" />
          </button>
        </div>
        {showHistorial && (
          <div className="w-full mb-3 p-2 border rounded bg-yellow-50 max-h-36 overflow-y-auto">
            <div className="mb-1 text-xs text-[#a52e00] font-bold">Últimas consultas:</div>
            <ul className="flex flex-wrap gap-2">
              {historial.map((q, idx) => (
                <li key={idx}>
                  <button
                    className="px-2 py-0.5 bg-white rounded shadow border text-xs text-blue-700 hover:bg-blue-50"
                    onClick={() => repetirConsulta(q)}
                  >
                    {q}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSend} className="flex w-full gap-2 mb-5">
          <input
            className="flex-1 border rounded-l px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
            type="text"
            placeholder="Escribe tu pregunta legal o término a buscar…"
            value={input}
            onChange={e => setInput(e.target.value)}
            autoFocus
          />
          <button
            className="bg-[#b03a1a] text-white px-6 py-2 rounded-r font-bold shadow hover:bg-[#942813] transition"
            type="submit"
          >
            Buscar
          </button>
        </form>

        {/* Resultados por fuente */}
        {consulta && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            {FUENTES.map(fuente => (
              <div key={fuente.key} className="bg-gray-50 rounded-lg shadow p-4 min-h-[160px] flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold text-[#b03a1a]">{fuente.label}</span>
                  {favoritos.includes(fuente.key) ? (
                    <FaStar
                      className="text-yellow-500 cursor-pointer"
                      onClick={() => toggleFavorito(fuente.key)}
                      title="Quitar de favoritos"
                    />
                  ) : (
                    <FaRegStar
                      className="text-gray-400 cursor-pointer"
                      onClick={() => toggleFavorito(fuente.key)}
                      title="Marcar como favorito"
                    />
                  )}
                  {loading[fuente.key] && <FaSpinner className="animate-spin text-blue-700 ml-2" />}
                </div>
                <div className="flex-1">
                  {errores[fuente.key] ? (
                    <div className="text-red-700 text-sm">{errores[fuente.key]}</div>
                  ) : (
                    <ul>
                      {(resultados[fuente.key] || []).length === 0 && !loading[fuente.key] &&
                        <li className="text-xs text-gray-500">Sin resultados.</li>
                      }
                      {(resultados[fuente.key] || []).map((r, idx) => (
                        <li
                          key={idx}
                          className={`
                            my-1 
                            ${favoritos.includes(fuente.key) ? 'font-bold bg-yellow-50 px-1 py-0.5 rounded' : ''}
                          `}
                        >
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={favoritos.includes(fuente.key) ? "text-[#b03a1a] underline" : "text-blue-700 underline"}
                            title={r.titulo}
                          >
                            {r.titulo}
                          </a>
                          {r.descripcion && (
                            <div className="text-xs text-gray-500">{r.descripcion}</div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
