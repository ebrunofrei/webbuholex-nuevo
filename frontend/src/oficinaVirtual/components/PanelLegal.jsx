import React from "react";
import { useNavigate } from "react-router-dom";

export default function PanelLegal() {
  const navigate = useNavigate();
  return (
    <section className="rounded-2xl bg-white shadow-lg border border-[#b03a1a]/10 p-5 flex-1 mt-8">
      <h2 className="text-lg font-bold mb-3 text-[#b03a1a] flex items-center gap-2">
        <span className="inline-block w-2 h-5 rounded bg-[#b03a1a] mr-2" />
        Panel Legal: Recursos Rápidos
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => navigate("/oficinaVirtual/modelos")}
          className="rounded-lg bg-[#faf8f6] hover:bg-[#fbeee2] shadow p-4 flex flex-col items-center border border-[#b03a1a]/30 transition-all"
        >
          <span className="text-2xl text-[#b03a1a] mb-1">📄</span>
          <span className="font-bold text-[#b03a1a]">Modelos de Escrito</span>
        </button>
        <button
          onClick={() => navigate("/oficinaVirtual/codigos")}
          className="rounded-lg bg-[#eaf8fc] hover:bg-[#d6f0fc] shadow p-4 flex flex-col items-center border border-[#41B6E6]/30 transition-all"
        >
          <span className="text-2xl text-[#41B6E6] mb-1">📚</span>
          <span className="font-bold text-[#41B6E6]">Códigos</span>
        </button>
        <button
          onClick={() => navigate("/oficinaVirtual/jurisprudencia")}
          className="rounded-lg bg-[#fdf7e3] hover:bg-[#f7e8a3] shadow p-4 flex flex-col items-center border border-[#D4AF37]/30 transition-all"
        >
          <span className="text-2xl text-[#D4AF37] mb-1">⚖️</span>
          <span className="font-bold text-[#D4AF37]">Jurisprudencia</span>
        </button>
        <button
          onClick={() => navigate("/oficinaVirtual/biblioteca")}
          className="rounded-lg bg-[#f7f5ef] hover:bg-[#f4ede6] shadow p-4 flex flex-col items-center border border-[#6C3F1B]/30 transition-all"
        >
          <span className="text-2xl text-[#6C3F1B] mb-1">📖</span>
          <span className="font-bold text-[#6C3F1B]">Libros Digitales</span>
        </button>
      </div>
    </section>
  );
}
