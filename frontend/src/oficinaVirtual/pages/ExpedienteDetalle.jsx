import React, { useState, useEffect } from "react";
import { FileText, User, ListChecks, BookOpen } from "lucide-react";
import TabDocumentos from "../components/TabDocumentos";
import PartesProcesales from "../components/PartesProcesales";
import Seguimiento from "../components/Seguimiento";
import { useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase";

const TABS = [
  { key: "documentos", label: "Documentos", icon: <FileText size={18} /> },
  { key: "resoluciones", label: "Resoluciones", icon: <BookOpen size={18} /> },
  { key: "partes", label: "Partes", icon: <User size={18} /> },
  { key: "historial", label: "Historial", icon: <ListChecks size={18} /> },
];

export default function ExpedienteDetalle() {
  const { expedienteId } = useParams();
  const [expediente, setExpediente] = useState(null);
  const [tab, setTab] = useState("documentos");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchExpediente = async () => {
      try {
        const ref = doc(db, "expedientes", expedienteId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setExpediente({ id: snap.id, ...snap.data() });
        } else {
          setError("Expediente no encontrado.");
        }
      } catch (err) {
        setError("Error al obtener el expediente.");
      } finally {
        setLoading(false);
      }
    };
    fetchExpediente();
  }, [expedienteId]);

  if (loading) return <div className="p-10 text-center text-gray-500">Cargando expediente...</div>;

  if (error) return (
    <div className="p-10 text-center text-red-700 bg-red-50 rounded-xl shadow">
      ❌ {error}
    </div>
  );

  const tipoBadge = expediente.tipo === "administrativo"
    ? <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full ml-2 font-semibold">Administrativo</span>
    : expediente.tipo === "judicial"
    ? <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full ml-2 font-semibold">Judicial</span>
    : null;

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-6">
      {/* CABECERA */}
      <div className="flex flex-wrap items-center justify-between border-b pb-4 mb-4 gap-4">
        <div>
          <div className="font-extrabold text-2xl text-[#b03a1a]">
            Expediente <span className="underline">{expediente.numeroExpediente}</span>
            <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-[#fff6e6] text-[#b03a1a] font-bold ml-2">
              {expediente.materia}
            </span>
            <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold ml-1">
              {expediente.año}
            </span>
            <span className={`inline-block text-xs px-2 py-0.5 rounded-full ml-1 font-bold ${
              expediente.estado === "Activo"
                ? "bg-green-100 text-green-800"
                : "bg-yellow-100 text-yellow-800"
            }`}>
              {expediente.estado}
            </span>
            {tipoBadge}
          </div>
          <div className="text-gray-700 mt-1">
            <b>Cliente:</b> {expediente.cliente} &nbsp; | &nbsp;
            <b>Juzgado/Sala:</b> {expediente.juzgado}
          </div>
          <div className="text-xs text-gray-500">
            <b>Responsable:</b> {expediente.responsable || "-"}
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex border-b mb-4 gap-2">
        {TABS.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-t-lg font-semibold flex items-center gap-2 transition-all ${
              tab === key
                ? "bg-[#b03a1a] text-white shadow"
                : "bg-gray-100 text-[#b03a1a] hover:bg-[#fff6e6]"
            }`}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* CONTENIDO */}
      <div className="mt-4">
        {tab === "documentos" && <TabDocumentos expedienteId={expedienteId} />}
        {tab === "resoluciones" && <Seguimiento expedienteId={expedienteId} />}
        {tab === "partes" && <PartesProcesales expedienteId={expedienteId} />}
        {tab === "historial" && <Seguimiento expedienteId={expedienteId} />}
      </div>
    </div>
  );
}
