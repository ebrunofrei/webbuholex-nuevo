// src/components/jurisprudencia/JurisprudenciaSearchBar.jsx
import React from "react";

export default function JurisprudenciaSearchBar({
  search, setSearch,
  materia, setMateria,
  organo, setOrgano,
  estado, setEstado
}) {
  // Listas predeterminadas para selects (puedes ajustar según tus materias y órganos reales)
  const materias = [
    "Constitucional","Civil","Procesal Civil","Penal","Procesal Penal","Laboral",
    "Procesal Laboral","Administrativo","Tributario","Comercial","Familia","Niñez y Adolescencia",
    "Ambiental","Municipal","Propiedad Intelectual","Internacional","Derechos Humanos"
  ];
  const organos = [
    "Tribunal Constitucional","Corte Suprema","Corte Superior","Juzgado Especializado",
    "Sala Plena","Juzgado de Paz Letrado","Ministerio Público","SUNARP","SUNAT"
  ];
  const estados = [
    "Vigente","Vinculante","Pleno Casatorio","Pleno Jurisdiccional","Derogada","Observada","Doctrina Probable"
  ];

  return (
    <div className="flex flex-wrap gap-3 mb-6 items-center">
      <input
        className="border rounded px-3 py-2 flex-1 min-w-[160px]"
        type="text"
        placeholder="Buscar por palabra clave"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <select value={materia} onChange={e => setMateria(e.target.value)} className="border rounded px-3 py-2">
        <option value="">Materia</option>
        {materias.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
      <select value={organo} onChange={e => setOrgano(e.target.value)} className="border rounded px-3 py-2">
        <option value="">Órgano</option>
        {organos.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <select value={estado} onChange={e => setEstado(e.target.value)} className="border rounded px-3 py-2">
        <option value="">Estado</option>
        {estados.map(e => <option key={e} value={e}>{e}</option>)}
      </select>
      <button
        className="bg-gray-100 text-gray-700 rounded px-3 py-2"
        onClick={() => { setSearch(""); setMateria(""); setOrgano(""); setEstado(""); }}
        type="button"
      >Limpiar</button>
    </div>
  );
}
