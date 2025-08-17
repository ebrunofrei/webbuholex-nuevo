import React, { useState } from "react";

// Utilidad para convertir años/meses/días a años decimales
function parseInputPena(penaAnios, penaMeses) {
  const anios = parseFloat(penaAnios) || 0;
  const meses = parseFloat(penaMeses) || 0;
  return anios + meses / 12;
}

// Utilidad para convertir años decimales a { años, meses, días }
function aniosADesglose(decimalAnios) {
  const anios = Math.floor(decimalAnios);
  const resto = (decimalAnios - anios) * 12;
  const meses = Math.floor(resto);
  const dias = Math.round((resto - meses) * 30.44); // promedio de días por mes
  return { anios, meses, dias };
}

function formateaDesglose(decimalAnios) {
  const { anios, meses, dias } = aniosADesglose(decimalAnios);
  let txt = [];
  if (anios) txt.push(`${anios} año${anios > 1 ? "s" : ""}`);
  if (meses) txt.push(`${meses} mes${meses > 1 ? "es" : ""}`);
  if (dias) txt.push(`${dias} día${dias > 1 ? "s" : ""}`);
  return txt.length ? txt.join(", ") : "0 días";
}

export default function HerramientaTercioPena({ onClose }) {
  // Tab activo
  const [tab, setTab] = useState("fracciones");
  // Fracciones simples
  const [penaAnios, setPenaAnios] = useState("");
  const [penaMeses, setPenaMeses] = useState("");
  const [fracciones, setFracciones] = useState(null);

  // Gradualidad
  const [minAnios, setMinAnios] = useState("");
  const [minMeses, setMinMeses] = useState("");
  const [maxAnios, setMaxAnios] = useState("");
  const [maxMeses, setMaxMeses] = useState("");
  const [gradualidad, setGradualidad] = useState(null);

  // Calcular fracciones simples
  function calcularFracciones(e) {
    e && e.preventDefault();
    const totalAnios = parseInputPena(penaAnios, penaMeses);
    if (!totalAnios || totalAnios <= 0) return setFracciones(null);
    setFracciones({
      unTercio: totalAnios / 3,
      unQuinto: totalAnios / 5,
      mitad: totalAnios / 2,
      dosTercios: (2 * totalAnios) / 3,
      tresCuartos: (3 * totalAnios) / 4,
      original: totalAnios,
    });
  }

  // Calcular tercios gradualidad
  function calcularGradualidad(e) {
    e && e.preventDefault();
    const min = parseInputPena(minAnios, minMeses);
    const max = parseInputPena(maxAnios, maxMeses);
    if (!min || !max || min >= max) return setGradualidad(null);
    const delta = max - min;
    const tercio = delta / 3;
    setGradualidad({
      inferior: [min, min + tercio],
      intermedio: [min + tercio, min + 2 * tercio],
      superior: [min + 2 * tercio, max],
      min, max,
    });
  }

  // Responsive y maxWidth adaptable
  const cajaStyle = {
    background: "#fff",
    borderRadius: 18,
    boxShadow: "0 8px 32px #0003",
    border: "3px solid #e6bb6a",
    maxWidth: 450,
    width: "95vw",
    padding: "32px 24px 24px 24px",
    position: "relative",
    margin: "0 auto"
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-2 py-4 bg-black/20">
      <div style={cajaStyle} className="animate-fade-in">
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute right-3 top-2 text-3xl text-yellow-900 hover:text-red-600 font-bold"
          style={{ cursor: "pointer" }}
          aria-label="Cerrar"
        >
          ×
        </button>
        {/* Título */}
        <div className="text-center mb-2">
          <h2 className="font-bold text-2xl text-yellow-900 mb-2">Herramientas LitisBot</h2>
          <a href="#" className="text-xs text-yellow-700 underline" onClick={e => { e.preventDefault(); onClose && onClose(); }}>
            ← Volver a herramientas
          </a>
        </div>
        {/* Tabs */}
        <h3 className="text-lg font-bold mt-2 mb-2 text-brown-700">Calculadora de Tercios de la Pena
          <span className="ml-2 text-xs px-2 py-1 rounded bg-yellow-100 border border-yellow-400 text-yellow-700 align-middle">Avanzado</span>
        </h3>
        <div className="flex gap-2 mb-2 justify-center">
          <button
            className={`px-3 py-1 rounded font-semibold text-sm border ${tab === "fracciones" ? "bg-yellow-200 border-yellow-600" : "bg-yellow-50 border-yellow-200 text-yellow-700"}`}
            onClick={() => setTab("fracciones")}
          >
            Fracciones simples
          </button>
          <button
            className={`px-3 py-1 rounded font-semibold text-sm border ${tab === "gradualidad" ? "bg-yellow-200 border-yellow-600" : "bg-yellow-50 border-yellow-200 text-yellow-700"}`}
            onClick={() => setTab("gradualidad")}
          >
            Tercios gradualidad
          </button>
        </div>

        {/* Fracciones simples */}
        {tab === "fracciones" && (
          <form className="space-y-2" onSubmit={calcularFracciones} autoComplete="off">
            <p className="text-sm text-gray-800 mb-2">
              Calcula <b>un tercio, un quinto, mitad, dos tercios o tres cuartos</b> de una pena concreta (para beneficios penitenciarios, redención, etc). Puedes ingresar años y meses.
            </p>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-sm">Pena total (años):</label>
                <input
                  type="number" min={0} step="1"
                  className="border rounded px-2 py-1 w-full"
                  value={penaAnios}
                  onChange={e => setPenaAnios(e.target.value)}
                  placeholder="Ej: 5"
                  inputMode="numeric"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm">Meses:</label>
                <input
                  type="number" min={0} max={11} step="1"
                  className="border rounded px-2 py-1 w-full"
                  value={penaMeses}
                  onChange={e => setPenaMeses(e.target.value)}
                  placeholder="Ej: 6"
                  inputMode="numeric"
                />
              </div>
            </div>
            <button type="submit"
              className="w-full py-2 rounded font-bold mt-2 bg-green-700 text-white hover:bg-green-800 transition">
              Calcular fracciones
            </button>
            {/* Resultados */}
            {fracciones && (
              <div className="space-y-2 mt-3">
                <div className="rounded-lg bg-yellow-50 border p-3">
                  <b>Un tercio (1/3):</b> {fracciones.unTercio.toFixed(2)} años (<span className="text-gray-700">{formateaDesglose(fracciones.unTercio)}</span>)<br />
                  <span className="text-xs text-gray-600">Se usa para beneficios penitenciarios y redención de penas.</span>
                </div>
                <div className="rounded-lg bg-yellow-50 border p-3">
                  <b>Un quinto (1/5):</b> {fracciones.unQuinto.toFixed(2)} años (<span className="text-gray-700">{formateaDesglose(fracciones.unQuinto)}</span>)<br />
                  <span className="text-xs text-gray-600">Se usa para beneficios penitenciarios y redención de penas.</span>
                </div>
                <div className="rounded-lg bg-yellow-50 border p-3">
                  <b>Mitad (1/2):</b> {fracciones.mitad.toFixed(2)} años (<span className="text-gray-700">{formateaDesglose(fracciones.mitad)}</span>)<br />
                  <span className="text-xs text-gray-600">Se usa para beneficios penitenciarios y redención de penas.</span>
                </div>
                <div className="rounded-lg bg-yellow-50 border p-3">
                  <b>Dos tercios (2/3):</b> {fracciones.dosTercios.toFixed(2)} años (<span className="text-gray-700">{formateaDesglose(fracciones.dosTercios)}</span>)<br />
                  <span className="text-xs text-gray-600">Se usa para beneficios penitenciarios y redención de penas.</span>
                </div>
                <div className="rounded-lg bg-yellow-50 border p-3">
                  <b>Tres cuartos (3/4):</b> {fracciones.tresCuartos.toFixed(2)} años (<span className="text-gray-700">{formateaDesglose(fracciones.tresCuartos)}</span>)<br />
                  <span className="text-xs text-gray-600">Se usa para beneficios penitenciarios y redención de penas.</span>
                </div>
                <div className="text-xs text-gray-500">
                  * Nota: Los decimales indican meses y días (por ejemplo, 7.67 años = 7 años, 8 meses, 0 días).
                </div>
              </div>
            )}
          </form>
        )}

        {/* Tercios gradualidad */}
        {tab === "gradualidad" && (
          <form className="space-y-2" onSubmit={calcularGradualidad} autoComplete="off">
            <p className="text-sm text-gray-800 mb-2">
              Calcula el tercio <b>inferior</b>, <b>intermedio</b> y <b>superior</b> sobre un rango penal (pena mínima y máxima, por individualización de pena o grados de participación).
            </p>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-sm">Pena mínima (años):</label>
                <input
                  type="number" min={0} step="1"
                  className="border rounded px-2 py-1 w-full"
                  value={minAnios}
                  onChange={e => setMinAnios(e.target.value)}
                  placeholder="Ej: 4"
                  inputMode="numeric"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm">Meses:</label>
                <input
                  type="number" min={0} max={11} step="1"
                  className="border rounded px-2 py-1 w-full"
                  value={minMeses}
                  onChange={e => setMinMeses(e.target.value)}
                  placeholder="Ej: 6"
                  inputMode="numeric"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-sm">Pena máxima (años):</label>
                <input
                  type="number" min={0} step="1"
                  className="border rounded px-2 py-1 w-full"
                  value={maxAnios}
                  onChange={e => setMaxAnios(e.target.value)}
                  placeholder="Ej: 12"
                  inputMode="numeric"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm">Meses:</label>
                <input
                  type="number" min={0} max={11} step="1"
                  className="border rounded px-2 py-1 w-full"
                  value={maxMeses}
                  onChange={e => setMaxMeses(e.target.value)}
                  placeholder="Ej: 0"
                  inputMode="numeric"
                />
              </div>
            </div>
            <button type="submit"
              className="w-full py-2 rounded font-bold mt-2 bg-green-700 text-white hover:bg-green-800 transition">
              Calcular tercios gradualidad
            </button>
            {gradualidad && (
              <div className="mt-3 space-y-2">
                <div className="rounded-lg bg-green-50 border-l-4 border-green-400 p-3">
                  <b>Tercio inferior:</b>
                  <br />
                  De <b>{gradualidad.inferior[0].toFixed(2)}</b> años a <b>{gradualidad.inferior[1].toFixed(2)}</b> años
                  <span className="text-xs text-gray-700">
                    <br />({formateaDesglose(gradualidad.inferior[0])} - {formateaDesglose(gradualidad.inferior[1])})
                  </span>
                  <br /><span className="text-xs text-gray-600">Individualizar en caso de atenuantes o menor gravedad.</span>
                </div>
                <div className="rounded-lg bg-yellow-50 border-l-4 border-yellow-500 p-3">
                  <b>Tercio intermedio:</b>
                  <br />
                  De <b>{gradualidad.intermedio[0].toFixed(2)}</b> años a <b>{gradualidad.intermedio[1].toFixed(2)}</b> años
                  <span className="text-xs text-gray-700">
                    <br />({formateaDesglose(gradualidad.intermedio[0])} - {formateaDesglose(gradualidad.intermedio[1])})
                  </span>
                  <br /><span className="text-xs text-gray-600">Usual para casos comunes, sin agravantes ni atenuantes calificadas.</span>
                </div>
                <div className="rounded-lg bg-red-50 border-l-4 border-red-400 p-3">
                  <b>Tercio superior:</b>
                  <br />
                  De <b>{gradualidad.superior[0].toFixed(2)}</b> años a <b>{gradualidad.superior[1].toFixed(2)}</b> años
                  <span className="text-xs text-gray-700">
                    <br />({formateaDesglose(gradualidad.superior[0])} - {formateaDesglose(gradualidad.superior[1])})
                  </span>
                  <br /><span className="text-xs text-gray-600">Para agravantes específicas, reincidencia o especial gravedad.</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  * Calculadora referencial. Revisa los artículos 45, 46 y 47 del Código Penal peruano y la jurisprudencia aplicable.
                </div>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
