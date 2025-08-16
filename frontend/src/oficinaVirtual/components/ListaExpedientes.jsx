import React, { useState } from "react";
import { Search, FolderOpen } from "lucide-react";
import { Link } from "react-router-dom";

const DEMO_EXPEDIENTES = [
  { id: "EXP001", numero: "2024-0154", materia: "Civil", cliente: "Juan Pérez", juzgado: "Civil 1", estado: "Activo", año: 2024 },
  { id: "EXP002", numero: "2024-0175", materia: "Penal", cliente: "Luisa Torres", juzgado: "Penal 3", estado: "Concluido", año: 2024 },
];

export default function ListaExpedientes() {
  const [query, setQuery] = useState("");
  const resultados = DEMO_EXPEDIENTES.filter(e =>
    e.numero.includes(query) ||
    e.materia.toLowerCase().includes(query.toLowerCase()) ||
    e.cliente.toLowerCase().includes(query.toLowerCase()) ||
    e.juzgado.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <Search />
        <input
          className="border rounded px-3 py-2 w-80"
          placeholder="Buscar expediente por número, materia, cliente..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>
      <div className="grid md:grid-cols-2 gap-5">
        {resultados.length === 0 && (
          <div className="text-gray-400 col-span-2">No se encontraron expedientes.</div>
        )}
        {resultados.map(exp => (
          <Link key={exp.id} to={`/oficina/expedientes/${exp.id}`}>
            <div className="bg-white rounded-xl shadow p-5 hover:bg-[#fff3e6] border">
              <div className="font-bold text-lg mb-1">{exp.numero} <span className="ml-2 text-xs bg-[#fbeedb] text-[#b03a1a] px-2 py-0.5 rounded">{exp.materia}</span></div>
              <div className="text-gray-700 text-sm"><b>Cliente:</b> {exp.cliente} | <b>Año:</b> {exp.año}</div>
              <div className="text-gray-500 text-xs"><b>Juzgado:</b> {exp.juzgado} | <b>Estado:</b> {exp.estado}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
