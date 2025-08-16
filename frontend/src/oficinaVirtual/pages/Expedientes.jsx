import React, { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/firebase";
import { useNavigate } from "react-router-dom";
import CrearExpediente from "../components/CrearExpediente";

const estadoColors = {
  "Activo": "bg-green-500",
  "Archivado": "bg-gray-500",
  "Pendiente": "bg-yellow-400",
  "En Agenda": "bg-blue-500",
  "Observado": "bg-red-500",
};

export default function Expedientes() {
  const [expedientes, setExpedientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroMateria, setFiltroMateria] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [ordenDesc, setOrdenDesc] = useState(true);
  const navigate = useNavigate();

  const cargarExpedientes = async () => {
    const q = query(
      collection(db, "expedientes"),
      orderBy("creadoEn", ordenDesc ? "desc" : "asc")
    );
    const snap = await getDocs(q);
    setExpedientes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  useEffect(() => {
    cargarExpedientes();
    // eslint-disable-next-line
  }, [ordenDesc]);

  const handleNuevoExp = () => cargarExpedientes();

  const materias = Array.from(new Set(expedientes.map(exp => exp.materia).filter(Boolean)));
  const estados = Array.from(new Set(expedientes.map(exp => exp.estado).filter(Boolean)));

  const expedientesFiltrados = expedientes
    .filter(exp =>
      !busqueda ||
      exp.numero?.toLowerCase().includes(busqueda.toLowerCase()) ||
      exp.cliente?.toLowerCase().includes(busqueda.toLowerCase())
    )
    .filter(exp => !filtroMateria || exp.materia === filtroMateria)
    .filter(exp => !filtroEstado || exp.estado === filtroEstado);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-extrabold mb-6 text-[#b03a1a] tracking-tight">
        Expedientes Judiciales
      </h1>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Buscar por número o cliente..."
          className="border rounded-md p-2 flex-1"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
        <select
          className="border rounded-md p-2"
          value={filtroMateria}
          onChange={e => setFiltroMateria(e.target.value)}
        >
          <option value="">Materia</option>
          {materias.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select
          className="border rounded-md p-2"
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value)}
        >
          <option value="">Estado</option>
          {estados.map(est => (
            <option key={est} value={est}>{est}</option>
          ))}
        </select>
        <button
          className="border rounded-md px-3 py-2 bg-gray-100 hover:bg-gray-200 text-sm"
          onClick={() => setOrdenDesc(!ordenDesc)}
          title="Invertir orden"
        >
          {ordenDesc ? "⬇ Más recientes" : "⬆ Más antiguos"}
        </button>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto mb-8">
        <table className="min-w-full text-sm text-left border-collapse bg-white rounded-lg shadow">
          <thead className="bg-[#fff6e6] text-[#4b3415] uppercase font-bold text-xs tracking-wide">
            <tr>
              <th className="py-3 px-4">#</th>
              <th className="py-3 px-4">N° Expediente</th>
              <th className="py-3 px-4">Materia</th>
              <th className="py-3 px-4">Año</th>
              <th className="py-3 px-4">Cliente</th>
              <th className="py-3 px-4">Juzgado</th>
              <th className="py-3 px-4">Estado</th>
              <th className="py-3 px-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="text-gray-800">
            {expedientesFiltrados.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-6 text-gray-400">
                  No hay expedientes para mostrar.
                </td>
              </tr>
            ) : (
              expedientesFiltrados.map((exp, idx) => (
                <tr
                  key={exp.id}
                  className="hover:bg-gray-50 transition border-b"
                >
                  <td className="px-4 py-2">{idx + 1}</td>
                  <td className="px-4 py-2 font-semibold text-[#b03a1a]">{exp.numero}</td>
                  <td className="px-4 py-2">{exp.materia}</td>
                  <td className="px-4 py-2">{exp.año}</td>
                  <td className="px-4 py-2">{exp.cliente}</td>
                  <td className="px-4 py-2">{exp.juzgado}</td>
                  <td className="px-4 py-2">
                    <span className={`px-3 py-1 text-xs font-bold rounded-full text-white ${estadoColors[exp.estado] || "bg-gray-400"}`}>
                      {exp.estado}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => navigate(`/expediente/${exp.id}`)}
                      className="text-sm text-blue-600 hover:underline font-medium"
                    >
                      Ver Detalle
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Crear expediente */}
      <CrearExpediente onCreado={handleNuevoExp} />
    </div>
  );
}
