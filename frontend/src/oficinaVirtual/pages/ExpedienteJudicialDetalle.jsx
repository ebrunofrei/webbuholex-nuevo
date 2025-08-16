import React, { useEffect, useRef, useState } from "react";
import { db, storage } from "@/firebase";
import { collection, query, orderBy, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import ArchivoCard from "../components/ArchivoCard";
import GrabadoraVoz from "../components/GrabadoraVoz";
import ArchivoViewerModal from "../components/ArchivoViewerModal";
import AgendadorPlazos from "../components/AgendadorPlazos";
import ResumenExpediente from "../components/ResumenExpediente";
import PartesProcesales from "../components/PartesProcesales";
import Seguimiento from "../components/Seguimiento";
import TabDocumentos from "../components/TabDocumentos";

export default function ExpedienteJudicialDetalle({ expedienteId }) {
  const [tab, setTab] = useState("documentos");

  const TABS = [
    { key: "documentos", label: "📁 Documentos" },
    { key: "resoluciones", label: "📄 Resoluciones" },
    { key: "partes", label: "👥 Partes" },
    { key: "historial", label: "🕒 Historial" }
  ];

  return (
    <div className="p-4">
      <ResumenExpediente expedienteId={expedienteId} />

      <div className="flex gap-3 mt-4 mb-6 overflow-x-auto">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded text-sm font-semibold flex items-center gap-2 transition-all ${
              tab === key ? "bg-[#b03a1a] text-white" : "bg-gray-100 text-[#b03a1a] hover:bg-[#fff6e6]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* CONTENIDO DE Tabs */}
      <div className="mt-4">
        {tab === "documentos" && <TabDocumentos expedienteId={expedienteId} />}
        {tab === "resoluciones" && <Seguimiento expedienteId={expedienteId} />}
        {tab === "partes" && <PartesProcesales expedienteId={expedienteId} />}
        {tab === "historial" && <Seguimiento expedienteId={expedienteId} modo="historial" />}
      </div>
    </div>
  );
}
