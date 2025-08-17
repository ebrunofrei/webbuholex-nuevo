import React, { useEffect, useState } from "react";
import { db } from "@/firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import dayjs from "dayjs";
import { useLitisBot } from "@/context/LitisBotContext.jsx";
import { Clock, FileText, AlertTriangle, ShieldCheck } from "lucide-react";

export default function ResumenExpediente({ expedienteId }) {
  const [archivoMadre, setArchivoMadre] = useState(null);
  const [resoluciones, setResoluciones] = useState([]);
  const [plazos, setPlazos] = useState([]);
  const [ultimaActividad, setUltimaActividad] = useState(null);
  const { abrirBot } = useLitisBot();

  useEffect(() => {
    if (!expedienteId) return;
    cargarDatos();
  }, [expedienteId]);

  const cargarDatos = async () => {
    const madreSnap = await getDocs(collection(db, "expedientes", expedienteId, "archivo_madre"));
    const madre = madreSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))[0];
    setArchivoMadre(madre);

    const resolSnap = await getDocs(collection(db, "expedientes", expedienteId, "resoluciones"));
    const resols = resolSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setResoluciones(resols);

    const plazosSnap = await getDocs(query(collection(db, "plazos"), where("expedienteId", "==", expedienteId)));
    const plazosData = plazosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setPlazos(plazosData);

    const fechas = [
      ...resols.map(r => r.fecha?.toDate?.() || null),
      ...plazosData.map(p => new Date(p.fechaLimite))
    ].filter(Boolean);
    setUltimaActividad(fechas.length ? new Date(Math.max(...fechas.map(f => +f))) : null);
  };

  const plazosPendientes = plazos.filter(p => p.estado === "pendiente");
  const plazosVencidos = plazosPendientes.filter(p => dayjs(p.fechaLimite).isBefore(dayjs()));

  const estado = plazosVencidos.length
    ? "Vencido"
    : plazosPendientes.length
    ? "Pendiente"
    : "Activo";

  const colores = {
    Activo: "bg-green-100 text-green-800",
    Pendiente: "bg-yellow-100 text-yellow-800",
    Vencido: "bg-red-100 text-red-800",
  };

  return (
    <div className="rounded-xl bg-white p-4 shadow mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-lg">Resumen del expediente</h3>
        <span className={`text-sm px-2 py-1 rounded-full font-semibold ${colores[estado]}`}>{estado}</span>
      </div>

      <ul className="text-sm space-y-2">
        <li className="flex items-center gap-2">
          <FileText size={16} className="text-gray-600" /> Archivo madre:
          <span className={archivoMadre ? "text-green-700 font-semibold" : "text-red-600 font-semibold"}>
            {archivoMadre ? "Cargado" : "Faltante"}
          </span>
        </li>

        <li className="flex items-center gap-2">
          <FileText size={16} className="text-gray-600" /> Resoluciones:
          <span className="font-semibold">{resoluciones.length}</span>
        </li>

        <li className="flex items-center gap-2">
          <Clock size={16} className="text-gray-600" /> Plazos pendientes:
          <span className="font-semibold text-orange-600">{plazosPendientes.length}</span>
          {plazosVencidos.length > 0 && (
            <span className="ml-2 text-xs text-red-700 font-bold">({plazosVencidos.length} vencidos)</span>
          )}
        </li>

        <li className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-gray-600" /> Última actividad:
          <span className="font-medium">{ultimaActividad ? dayjs(ultimaActividad).format("DD/MM/YYYY") : "--"}</span>
        </li>
      </ul>

      {plazosVencidos.length > 0 && (
        <button
          className="mt-4 bg-red-700 hover:bg-red-800 text-white text-sm px-4 py-2 rounded flex items-center gap-2"
          onClick={() => abrirBot({ expediente: expedienteId, alerta: "plazos_vencidos" })}
        >
          <AlertTriangle size={16} /> Alertar a LitisBot
        </button>
      )}
    </div>
  );
}
