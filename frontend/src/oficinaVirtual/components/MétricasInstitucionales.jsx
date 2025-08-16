import React from "react";
import { useNavigate } from "react-router-dom";

export default function MétricasInstitucionales({ metricas }) {
  const navigate = useNavigate();
  // metricas = [{ cantidad, titulo, color, ruta }]
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-2 mb-6">
      {metricas.map((metrica, i) => (
        <div
          key={i}
          onClick={() => metrica.ruta && navigate(metrica.ruta)}
          className="rounded-xl shadow-md p-6 flex flex-col items-center justify-center cursor-pointer transition-all duration-150"
          style={{ background: metrica.color, color: metrica.textColor || "#fff" }}
        >
          <div className="text-4xl font-extrabold">{metrica.cantidad}</div>
          <div className="text-base font-semibold mt-2">{metrica.titulo}</div>
        </div>
      ))}
    </div>
  );
}
