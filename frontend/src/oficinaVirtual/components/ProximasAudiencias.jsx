import React from "react";
import { useNavigate } from "react-router-dom";

export default function ProximasAudiencias({ audiencia }) {
  const navigate = useNavigate();
  return (
    <section className="rounded-2xl bg-white shadow-lg border border-[#41B6E6]/10 p-5 flex-1">
      <h2 className="text-lg font-bold mb-3 text-[#41B6E6] flex items-center gap-2">
        <span className="inline-block w-2 h-5 rounded bg-[#41B6E6] mr-2" />
        Próximas Audiencias
      </h2>
      <div className="rounded-xl bg-[#eaf8fc] p-4 flex flex-col gap-1 border border-[#41B6E6]/20">
        {audiencia ? (
          <>
            <div className="font-bold text-[#b03a1a]">{audiencia.asunto}</div>
            <div className="text-sm text-gray-700">
              {audiencia.fecha} — {audiencia.hora}
            </div>
            <div className="text-xs text-gray-600">{audiencia.juzgado}</div>
          </>
        ) : (
          <div className="text-sm text-gray-700">Sin eventos próximos.</div>
        )}
      </div>
      <button
        onClick={() => navigate("/oficinaVirtual/agenda")}
        className="block mt-3 text-sm text-[#41B6E6] font-bold hover:underline ml-1"
      >
        Ver agenda completa →
      </button>
    </section>
  );
}
