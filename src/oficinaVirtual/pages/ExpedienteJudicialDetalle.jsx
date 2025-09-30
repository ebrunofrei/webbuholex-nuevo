import React, { useEffect, useRef, useState } from "react";
import { db, auth, storage } from "@/firebase";
import { collection, query, orderBy, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import ArchivoCard from "@components/../components/ArchivoCard".replace("components/", "");
import GrabadoraVoz from "@components/../components/GrabadoraVoz".replace("components/", "");
import ArchivoViewerModal from "@components/../components/ArchivoViewerModal".replace("components/", "");
import AgendadorPlazos from "@components/../components/AgendadorPlazos".replace("components/", "");
import ResumenExpediente from "@components/../components/ResumenExpediente".replace("components/", "");
import PartesProcesales from "@components/../components/PartesProcesales".replace("components/", "");
import Seguimiento from "@components/../components/Seguimiento".replace("components/", "");
import TabDocumentos from "@components/../components/TabDocumentos".replace("components/", "");

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
