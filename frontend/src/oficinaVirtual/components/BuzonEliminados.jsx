import React from "react";
import { useNavigate } from "react-router-dom";

export default function BuzonEliminados({ archivos }) {
  const navigate = useNavigate();
  return (
    <section className="rounded-2xl bg-white shadow-lg border border-[#6C3F1B]/10 p-5 flex-1 mt-8">
      <h2 className="text-lg font-bold mb-3 text-[#6C3F1B] flex items-center gap-2">
        <span className="inline-block w-2 h-5 rounded bg-[#6C3F1B] mr-2" />
        Buzón de Eliminados
      </h2>
      <div className="flex flex-col md:flex-row gap-4">
        {archivos.map((file, i) => (
          <div
            key={i}
            className="flex-1 min-w-[180px] rounded-xl border border-[#6C3F1B]/30 bg-[#f8f4f0] p-4 shadow-sm flex flex-col gap-1"
          >
            <div className="font-semibold text-[#6C3F1B]">{file.nombre}</div>
            <div className="text-xs text-gray-700">
              {file.tipo} · Eliminado: {file.fecha}
            </div>
            <div className="flex gap-3 mt-1">
              <button className="text-xs font-medium text-[#6C3F1B] hover:underline">
                Restaurar
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={() => navigate("/oficinaVirtual/buzon")}
        className="block mt-3 text-sm text-[#6C3F1B] font-bold hover:underline ml-1"
      >
        Ir al Buzón →
      </button>
    </section>
  );
}
