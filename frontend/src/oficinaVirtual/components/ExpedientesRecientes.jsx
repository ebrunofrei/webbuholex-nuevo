import React from "react";
import { useNavigate } from "react-router-dom";

export default function ExpedientesRecientes({ expedientes = [] }) {
  const navigate = useNavigate();

  return (
    <section className="rounded-2xl bg-white shadow-lg border border-[#b03a1a]/10 p-5 flex-1">
      <h2 className="text-lg font-bold mb-3 text-[#b03a1a] flex items-center gap-2">
        <span className="inline-block w-2 h-5 rounded bg-[#b03a1a] mr-2" />
        Tus Expedientes Recientes
      </h2>
      <div className="flex flex-col md:flex-row gap-4">
        {expedientes.map((d, i) => (
          <div
            key={i}
            className="flex-1 min-w-[180px] rounded-xl border border-[#b03a1a]/30 bg-[#faf8f6] p-4 shadow-sm flex flex-col gap-1"
          >
            <div className="font-semibold text-[#b03a1a]">{d.nombre}</div>
            <div className="text-xs text-gray-700">
              Materia: <span className="font-medium">{d.materia}</span> · Año: {d.año}
            </div>
            <div className="flex gap-3 mt-1">
              <button className="text-xs font-medium text-[#7b1315] hover:underline">
                Ver
              </button>
              <button className="text-xs font-medium text-[#7b1315] hover:underline">
                Descargar
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={() => navigate("/oficinaVirtual/expedientes")}
        className="block mt-3 text-sm text-[#b03a1a] font-bold hover:underline ml-1"
      >
        Ver todos los expedientes →
      </button>
    </section>
  );
}
