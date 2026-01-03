import React from "react";

// Importa todas las herramientas
import HerramientaMultilingue from "./Herramientas/HerramientaMultilingue";
import HerramientaAnalizador from "./Herramientas/HerramientaAnalizador";
import HerramientaAgenda from "./Herramientas/HerramientaAgenda";
import HerramientaRecordatorios from "./Herramientas/HerramientaRecordatorios";
import HerramientaAudiencia from "./Herramientas/HerramientaAudiencia";
import HerramientaTraducir from "./Herramientas/HerramientaTraducir";
import HerramientaTercioPena from "./Herramientas/HerramientaTercioPena";
import HerramientaLiquidacionLaboral from "./Herramientas/HerramientaLiquidacionLaboral";

// Define las herramientas disponibles
const HERRAMIENTAS = [
  { key: "multilingue", label: "Multilingüe", desc: "Traduce textos a varios idiomas" },
  { key: "audiencia", label: "Audiencia", desc: "Tips y notas rápidas para audiencias" },
  { key: "analizador", label: "Analizador", desc: "Sube archivos y obtén análisis jurídico", pro: true },
  { key: "agenda", label: "Agenda", desc: "Registra eventos legales importantes", pro: true },
  { key: "recordatorios", label: "Recordatorios", desc: "Configura alertas legales personales" },
  { key: "traducir", label: "Traductor simple", desc: "Traducción directa de textos", pro: true },
  { key: "tercio_pena", label: "Cálculo Tercio Pena", desc: "Calculadora legal para condenas", pro: true },
  { key: "liquidacion_laboral", label: "Liquidación Laboral", desc: "Herramienta laboral avanzada", pro: true },
  { key: "docente", label: "Modo Docente" }
];

export default function ModalHerramientas({
  onClose,
  herramienta,
  setHerramienta,
  pro,
  error,
  setError,
  onSelectHerramienta,
}) {
  function handleClick(key, proRequired) {
    if (proRequired && !pro) {
      setError && setError("Hazte PRO para usar esta herramienta");
      setTimeout(() => setError && setError(""), 2000);
      return;
    }
    setHerramienta(key);
    // ✅ NUEVO: notificar al padre que se eligió una herramienta
    if (onSelectHerramienta) {
      onSelectHerramienta(key);
    }
  }
  function renderHerramienta() {
    switch (herramienta) {
      case "multilingue":
        return <HerramientaMultilingue onClose={onClose} />;
      case "audiencia":
        return <HerramientaAudiencia onClose={onClose} />;
      case "analizador":
        return <HerramientaAnalizador onClose={onClose} />;
      case "agenda":
        return <HerramientaAgenda onClose={onClose} />;
      case "recordatorios":
        return <HerramientaRecordatorios onClose={onClose} />;
      case "traducir":
        return <HerramientaTraducir onClose={onClose} />;
      case "tercio_pena":
        return <HerramientaTercioPena onClose={onClose} />;
      case "liquidacion_laboral":
        return <HerramientaLiquidacionLaboral onClose={onClose} />;
      default:
        return null;
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center px-3">
      <div className="bg-white rounded-2xl shadow-lg p-7 min-w-[350px] max-w-lg w-full relative border-2 border-yellow-600">
        <button
          onClick={onClose}
          className="absolute right-3 top-2 text-yellow-700 text-2xl font-bold"
          style={{ cursor: "pointer" }}
          aria-label="Cerrar"
        >×</button>

        <h2 className="font-bold text-2xl mb-4 text-yellow-700 flex items-center gap-2">
          Herramientas LitisBot
        </h2>

        {!herramienta ? (
          <div className="flex flex-col gap-2">
            {HERRAMIENTAS.map(h => (
              <button
                key={h.key}
                className={`flex flex-col text-left px-4 py-2 rounded-xl border border-yellow-200 transition
                ${(!h.pro || pro) ? "bg-yellow-50 hover:bg-yellow-100 text-yellow-900" : "bg-gray-100 text-gray-400 cursor-not-allowed opacity-60"}`}
                onClick={() => handleClick(h.key, h.pro)}
                disabled={h.pro && !pro}
                title={h.desc}
              >
                <span className="font-bold">
                  {h.label} {h.pro && <span className="ml-1 text-xs bg-yellow-200 px-2 py-0.5 rounded">PRO</span>}
                </span>
                <span className="text-xs">{h.desc}</span>
              </button>
            ))}
          </div>
        ) : (
          <>
            <a
              href="#"
              onClick={e => {
                e.preventDefault();
                setHerramienta(null);
              }}
              className="text-xs text-yellow-700 underline mb-2 block"
            >
              ← Volver a herramientas
            </a>
            {renderHerramienta()}
          </>
        )}
        {error && <div className="mt-2 text-red-700 text-sm">{error}</div>}
      </div>
    </div>
  );
}
