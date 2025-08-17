import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase";
import { FolderPlus } from "lucide-react";

export default function ExpedientesAdministrativos() {
  const [expedientes, setExpedientes] = useState([]);
  const [filtro, setFiltro] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const cargarExpedientes = async () => {
      const snap = await getDocs(collection(db, "expedientes"));
      const lista = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const administrativos = lista.filter(e => e.tipo === "administrativo");
      setExpedientes(administrativos);
    };
    cargarExpedientes();
  }, []);

  const filtrados = expedientes.filter(e =>
    e.numero.toLowerCase().includes(filtro.toLowerCase()) ||
    e.cliente?.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-[#b03a1a]">Expedientes Administrativos</h2>
        <button
          onClick={() => navigate("/oficinaVirtual/crear-expediente")}
          className="bg-[#b03a1a] text-white px-4 py-2 rounded flex items-center gap-2"
        >
          <FolderPlus size={18} /> Nuevo
        </button>
      </div>

      <input
        type="text"
        placeholder="Buscar por número o cliente..."
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        className="w-full mb-4 px-4 py-2 border rounded"
      />

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-xl overflow-hidden shadow">
          <thead className="bg-[#fff6f0]">
            <tr className="text-left text-sm text-gray-500">
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">Nº EXPEDIENTE</th>
              <th className="px-4 py-2">MATERIA</th>
              <th className="px-4 py-2">AÑO</th>
              <th className="px-4 py-2">CLIENTE</th>
              <th className="px-4 py-2">DEPENDENCIA</th>
              <th className="px-4 py-2">ESTADO</th>
              <th className="px-4 py-2">ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((expediente, i) => (
              <tr
                key={expediente.id}
                className="hover:bg-[#fef2ec] text-sm border-t"
              >
                <td className="px-4 py-2">{i + 1}</td>
                <td className="px-4 py-2 text-[#b03a1a] font-semibold">{expediente.numero}</td>
                <td className="px-4 py-2">{expediente.materia}</td>
                <td className="px-4 py-2">{expediente.anio}</td>
                <td className="px-4 py-2">{expediente.cliente}</td>
                <td className="px-4 py-2">{expediente.juzgado}</td>
                <td className="px-4 py-2">
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded-full ${
                      expediente.estado === "activo"
                        ? "bg-green-100 text-green-600"
                        : expediente.estado === "cerrado"
                        ? "bg-gray-200 text-gray-500"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {expediente.estado}
                  </span>
                </td>
                <td className="px-4 py-2 text-blue-600 hover:underline cursor-pointer"
                  onClick={() => navigate(`/oficinaVirtual/expediente-adm/${expediente.numero}`)}
                >
                  Ver Detalle
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}