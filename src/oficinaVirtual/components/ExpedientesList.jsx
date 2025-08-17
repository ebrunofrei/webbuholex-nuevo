import React, { useEffect, useState } from "react";
import { getDocs, collection } from "firebase/firestore";
import { db } from "@/firebase/config"; // Asegúrate que tu Firebase esté bien configurado
import { useNavigate } from "react-router-dom";

export default function ExpedientesList() {
  const [expedientes, setExpedientes] = useState([]);
  const [filtroMateria, setFiltroMateria] = useState("");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [textoBusqueda, setTextoBusqueda] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchExpedientes = async () => {
      const querySnapshot = await getDocs(collection(db, "expedientes"));
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setExpedientes(data);
    };
    fetchExpedientes();
  }, []);

  const materiasUnicas = [...new Set(expedientes.map(e => e.materia || "Sin materia"))];
  const clientesUnicos = [...new Set(expedientes.map(e => e.cliente || "Sin cliente"))];

  const expedientesFiltrados = expedientes.filter(e => {
    const texto = textoBusqueda.toLowerCase();
    const coincideTexto = !textoBusqueda ||
      (e.numeroExpediente?.toLowerCase().includes(texto) ||
      e.cliente?.toLowerCase().includes(texto));

    return coincideTexto &&
      (filtroMateria ? (e.materia || "Sin materia") === filtroMateria : true) &&
      (filtroCliente ? (e.cliente || "Sin cliente") === filtroCliente : true);
  });

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Expedientes</h2>

      <div className="flex flex-wrap gap-4 mb-6">
        <select
          value={filtroMateria}
          onChange={e => setFiltroMateria(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="">Todas las materias</option>
          {materiasUnicas.map((m, i) => (
            <option key={i} value={m}>{m}</option>
          ))}
        </select>

        <select
          value={filtroCliente}
          onChange={e => setFiltroCliente(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="">Todos los clientes</option>
          {clientesUnicos.map((c, i) => (
            <option key={i} value={c}>{c}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Buscar por número o cliente"
          onChange={e => setTextoBusqueda(e.target.value)}
          className="p-2 border rounded w-full md:w-1/2"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {expedientesFiltrados.length === 0 ? (
          <div className="text-gray-500">No hay expedientes con estos filtros.</div>
        ) : (
          expedientesFiltrados.map(exp => (
            <div
              key={exp.id}
              className="p-4 border rounded shadow-sm bg-white hover:bg-gray-50 transition cursor-pointer"
              onClick={() => navigate(`/expediente/${exp.id}`)}
            >
              <h3 className="font-semibold text-lg">{exp.numeroExpediente}</h3>
              <p><strong>Cliente:</strong> {exp.cliente}</p>
              <p><strong>Materia:</strong> {exp.materia}</p>
              <p><strong>Año:</strong> {exp.año}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
