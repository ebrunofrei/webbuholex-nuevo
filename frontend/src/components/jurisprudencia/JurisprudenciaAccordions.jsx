// src/components/jurisprudencia/JurisprudenciaAccordions.jsx
import React, { useState } from "react";
import JurisprudenciaCard from "./JurisprudenciaCard";

export default function JurisprudenciaAccordions({ data }) {
  const [open, setOpen] = useState({
    vinculante: false,
    plenosCasatorios: false,
    plenosJurisdiccionales: false,
  });

  const vinculantes = data.filter(j => j.estado?.toLowerCase() === "vinculante");
  const plenosCasatorios = data.filter(j =>
    j.estado?.toLowerCase().includes("pleno casatorio")
  );
  const plenosJurisdiccionales = data.filter(j =>
    j.estado?.toLowerCase().includes("pleno jurisdiccional")
  );

  return (
    <div className="space-y-2 my-6">
      {/* Vinculante */}
      <div className="border rounded">
        <button
          className="w-full text-left px-4 py-3 font-medium bg-yellow-50 hover:bg-yellow-100 rounded-t transition"
          onClick={() => setOpen(o => ({ ...o, vinculante: !o.vinculante }))}
        >
          Jurisprudencia Vinculante
          <span className="float-right">{open.vinculante ? "▲" : "▼"}</span>
        </button>
        {open.vinculante && (
          <div className="p-4 space-y-4">
            {vinculantes.length === 0
              ? <div className="text-gray-400 text-sm">No hay jurisprudencia vinculante registrada.</div>
              : (
                <div className="grid md:grid-cols-2 gap-4">
                  {vinculantes.map(j => (
                    <JurisprudenciaCard key={j.id} data={j} />
                  ))}
                </div>
              )
            }
          </div>
        )}
      </div>
      {/* Plenos Casatorios */}
      <div className="border rounded">
        <button
          className="w-full text-left px-4 py-3 font-medium bg-blue-50 hover:bg-blue-100 rounded-t transition"
          onClick={() => setOpen(o => ({ ...o, plenosCasatorios: !o.plenosCasatorios }))}
        >
          Plenos Casatorios
          <span className="float-right">{open.plenosCasatorios ? "▲" : "▼"}</span>
        </button>
        {open.plenosCasatorios && (
          <div className="p-4 space-y-4">
            {plenosCasatorios.length === 0
              ? <div className="text-gray-400 text-sm">No hay plenos casatorios registrados.</div>
              : (
                <div className="grid md:grid-cols-2 gap-4">
                  {plenosCasatorios.map(j => (
                    <JurisprudenciaCard key={j.id} data={j} />
                  ))}
                </div>
              )
            }
          </div>
        )}
      </div>
      {/* Plenos Jurisdiccionales */}
      <div className="border rounded">
        <button
          className="w-full text-left px-4 py-3 font-medium bg-green-50 hover:bg-green-100 rounded-t transition"
          onClick={() => setOpen(o => ({ ...o, plenosJurisdiccionales: !o.plenosJurisdiccionales }))}
        >
          Plenos Jurisdiccionales
          <span className="float-right">{open.plenosJurisdiccionales ? "▲" : "▼"}</span>
        </button>
        {open.plenosJurisdiccionales && (
          <div className="p-4 space-y-4">
            {plenosJurisdiccionales.length === 0
              ? <div className="text-gray-400 text-sm">No hay plenos jurisdiccionales registrados.</div>
              : (
                <div className="grid md:grid-cols-2 gap-4">
                  {plenosJurisdiccionales.map(j => (
                    <JurisprudenciaCard key={j.id} data={j} />
                  ))}
                </div>
              )
            }
          </div>
        )}
      </div>
    </div>
  );
}
