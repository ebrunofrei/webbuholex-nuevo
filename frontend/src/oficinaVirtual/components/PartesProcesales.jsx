import { useState } from "react";

const DEMO_PARTES = [
  { nombre: "Juan Pérez", tipo: "Demandante", doc: "DNI 12345678" },
  { nombre: "Luisa Torres", tipo: "Demandado", doc: "DNI 23456789" },
];

export default function PartesProcesales({ expedienteId }) {
  const [partes, setPartes] = useState(DEMO_PARTES);
  const [nuevo, setNuevo] = useState({ nombre: "", tipo: "", doc: "" });

  const agregarParte = () => {
    if (!nuevo.nombre || !nuevo.tipo) return;
    setPartes([...partes, nuevo]);
    setNuevo({ nombre: "", tipo: "", doc: "" });
    // Aquí podrías guardar en Firestore
  };

  return (
    <div className="p-3">
      <h3 className="text-lg font-bold mb-3">Partes Procesales</h3>
      <div className="space-y-2">
        {partes.map((p, i) => (
          <div key={i} className="bg-gray-100 rounded px-4 py-2 flex justify-between items-center">
            <div>
              <span className="font-semibold">{p.nombre}</span>
              <span className="ml-2 text-xs text-gray-500">{p.tipo}</span>
              <span className="ml-3 text-xs text-gray-400">{p.doc}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 border-t pt-4">
        <input
          className="border rounded px-2 py-1 mr-2 mb-2"
          placeholder="Nombre completo"
          value={nuevo.nombre}
          onChange={e => setNuevo(n => ({ ...n, nombre: e.target.value }))}
        />
        <input
          className="border rounded px-2 py-1 mr-2 mb-2"
          placeholder="Tipo (Demandante, Demandado...)"
          value={nuevo.tipo}
          onChange={e => setNuevo(n => ({ ...n, tipo: e.target.value }))}
        />
        <input
          className="border rounded px-2 py-1 mr-2 mb-2"
          placeholder="Documento"
          value={nuevo.doc}
          onChange={e => setNuevo(n => ({ ...n, doc: e.target.value }))}
        />
        <button className="bg-[#b03a1a] text-white px-4 py-1 rounded" onClick={agregarParte}>
          Agregar parte
        </button>
      </div>
    </div>
  );
}
