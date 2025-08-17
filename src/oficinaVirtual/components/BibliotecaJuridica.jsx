import React from "react";
import { useNavigate } from "react-router-dom";

export default function BibliotecaJuridica({ documentos }) {
  const navigate = useNavigate();
  return (
    <section className="rounded-2xl bg-white shadow-lg border border-[#41B6E6]/10 p-5 flex-1 mt-8">
      <h2 className="text-lg font-bold mb-3 text-[#41B6E6] flex items-center gap-2">
        <span className="inline-block w-2 h-5 rounded bg-[#41B6E6] mr-2" />
        Biblioteca Jurídica
      </h2>
      <div className="flex flex-col md:flex-row gap-4">
        {documentos.map((doc, i) => (
          <div
            key={i}
            className="flex-1 min-w-[180px] rounded-xl border border-[#41B6E6]/30 bg-[#eaf8fc] p-4 shadow-sm flex flex-col gap-1"
          >
            <div className="font-semibold text-[#41B6E6]">{doc.nombre}</div>
            <div className="text-xs text-gray-700">
              Tipo: <span className="font-medium">{doc.tipo}</span> · Año: {doc.año}
            </div>
            <div className="flex gap-3 mt-1">
              <button className="text-xs font-medium text-[#2078A0] hover:underline">
                Ver
              </button>
              <button className="text-xs font-medium text-[#2078A0] hover:underline">
                Descargar
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={() => navigate("/oficinaVirtual/biblioteca")}
        className="block mt-3 text-sm text-[#41B6E6] font-bold hover:underline ml-1"
      >
        Ver toda la biblioteca →
      </button>
    </section>
  );
}
