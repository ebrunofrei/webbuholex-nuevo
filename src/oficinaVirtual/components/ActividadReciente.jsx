import React from "react";

export default function ActividadReciente({ actividad }) {
  return (
    <section className="rounded-2xl bg-white shadow-lg border border-[#b03a1a]/10 p-5 flex-1 mt-8">
      <h2 className="text-lg font-bold mb-3 text-[#b03a1a] flex items-center gap-2">
        <span className="inline-block w-2 h-5 rounded bg-[#b03a1a] mr-2" />
        Actividad Reciente
      </h2>
      <div className="flex flex-col gap-3">
        {actividad.map((a, i) => (
          <div
            key={i}
            className="rounded-xl border border-[#b03a1a]/30 bg-[#faf8f6] p-3 flex flex-col md:flex-row md:items-center gap-2"
          >
            <div className="font-bold text-[#b03a1a]">{a.user}</div>
            <div className="flex-1 text-gray-700 text-sm">{a.accion}</div>
            <div className="text-xs text-gray-500">{a.fecha}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
