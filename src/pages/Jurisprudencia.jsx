import React, { useEffect, useState } from "react";
import { getJurisprudencia } from "@/services/jurisprudenciaService";
import JurisprudenciaCard from "@/components/jurisprudencia/JurisprudenciaCard";
import JurisprudenciaSearchBar from "@/components/jurisprudencia/JurisprudenciaSearchBar";
import JurisprudenciaVisorModal from "@/components/jurisprudencia/JurisprudenciaVisorModal";

export default function Jurisprudencia() {
  const [juris, setJuris] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal visor
  const [visorOpen, setVisorOpen] = useState(false);
  const [visorDoc, setVisorDoc] = useState(null);

  // Filtros
  const [search, setSearch] = useState("");
  const [materia, setMateria] = useState("");
  const [organo, setOrgano] = useState("");
  const [estado, setEstado] = useState("");
  const [chipFilter, setChipFilter] = useState("");

  useEffect(() => {
    getJurisprudencia().then(data => {
      setJuris(data);
      setFiltered(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    let results = juris;
    if (search)
      results = results.filter(j =>
        j.titulo?.toLowerCase().includes(search.toLowerCase()) ||
        j.resumen?.toLowerCase().includes(search.toLowerCase())
      );
    if (materia) results = results.filter(j => j.materia === materia);
    if (organo) results = results.filter(j => j.organo === organo);
    if (estado) results = results.filter(j => j.estado === estado);

    if (chipFilter === "recientes") {
      results = [...results].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    }
    if (chipFilter === "citadas") {
      results = [...results].sort((a, b) => (b.citas || 0) - (a.citas || 0));
    }
    if (chipFilter === "destacadas") {
      results = results.filter(j => j.destacada);
    }
    setFiltered(results);
  }, [search, materia, organo, estado, juris, chipFilter]);

  return (
    <section className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8 text-center">Jurisprudencia</h1>
      {/* Chips rápidos */}
      <div className="flex flex-wrap gap-2 mb-4 justify-center">
        <button
          className={`px-3 py-1 rounded-full text-xs border transition 
            ${chipFilter === "" ? "bg-red-600 text-white border-red-600 shadow" : "bg-white text-red-600 border-red-200"}`}
          onClick={() => setChipFilter("")}
        >Todas</button>
        <button
          className={`px-3 py-1 rounded-full text-xs border transition 
            ${chipFilter === "recientes" ? "bg-blue-600 text-white border-blue-600 shadow" : "bg-white text-blue-700 border-blue-200"}`}
          onClick={() => setChipFilter("recientes")}
        >Recientes</button>
        <button
          className={`px-3 py-1 rounded-full text-xs border transition 
            ${chipFilter === "citadas" ? "bg-green-600 text-white border-green-600 shadow" : "bg-white text-green-700 border-green-200"}`}
          onClick={() => setChipFilter("citadas")}
        >Más citadas</button>
        <button
          className={`px-3 py-1 rounded-full text-xs border transition 
            ${chipFilter === "destacadas" ? "bg-yellow-500 text-white border-yellow-500 shadow" : "bg-white text-yellow-700 border-yellow-200"}`}
          onClick={() => setChipFilter("destacadas")}
        >Destacadas</button>
      </div>

      <JurisprudenciaSearchBar
        search={search} setSearch={setSearch}
        materia={materia} setMateria={setMateria}
        organo={organo} setOrgano={setOrgano}
        estado={estado} setEstado={setEstado}
      />
      {loading ? (
        <div className="text-center text-gray-500 py-12">Cargando jurisprudencia...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-12">Sin resultados para la búsqueda.</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          {filtered.map(j => (
            <JurisprudenciaCard
              key={j.id}
              data={j}
              onVer={doc => {
                setVisorDoc(doc);
                setVisorOpen(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Visor PDF modal */}
      <JurisprudenciaVisorModal
        open={visorOpen}
        onClose={() => setVisorOpen(false)}
        doc={visorDoc}
      />
    </section>
  );
}
