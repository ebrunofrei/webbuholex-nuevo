import React, { useState } from "react";
import { FileText, User, ListChecks, Layers, BookOpen } from "lucide-react";

const TABS = [
  { key: "documentos", label: "Documentos", icon: <FileText size={18} /> },
  { key: "resoluciones", label: "Resoluciones", icon: <BookOpen size={18} /> },
  { key: "partes", label: "Partes", icon: <User size={18} /> },
  { key: "historial", label: "Historial", icon: <ListChecks size={18} /> },
];

export default function DetalleExpediente({ expediente, documentos, resoluciones, partes, historial }) {
  const [tab, setTab] = useState("documentos");

  if (!expediente) return (
    <div className="p-10 text-center text-red-700 bg-red-50 rounded-xl shadow">
      ❌ Expediente no encontrado.
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-6">
      {/* Cabecera institucional */}
      <div className="flex flex-wrap items-center justify-between border-b pb-4 mb-4 gap-4">
        <div>
          <div className="font-extrabold text-2xl text-[#b03a1a]">
            Expediente {expediente.numero || expediente.id} &nbsp;
            <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-[#fff6e6] text-[#b03a1a] font-bold ml-1">{expediente.materia}</span>
            <span className={`inline-block text-xs px-2 py-0.5 rounded-full ml-1 font-bold ${
              expediente.estado === "Activo"
                ? "bg-green-100 text-green-800"
                : "bg-yellow-100 text-yellow-800"
            }`}>{expediente.estado}</span>
          </div>
          <div className="text-gray-700 mt-1">
            <b>Cliente:</b> {expediente.cliente} &nbsp; | &nbsp;
            <b>Año:</b> {expediente.año} &nbsp; | &nbsp;
            <b>Juzgado/Sala:</b> {expediente.juzgado}
          </div>
          <div className="text-xs text-gray-500">
            <b>Responsable:</b> {expediente.responsable}
          </div>
        </div>
        {/* Acciones rápidas */}
        <div className="flex flex-wrap gap-2">
          {/* Aquí puedes agregar acciones: Editar, Descargar, Nueva Resolución... */}
        </div>
      </div>

      {/* Tabs */}
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

      {/* Paneles de cada tab */}
      <div className="mt-4">
        {tab === "documentos" && (
          <TabDocumentos documentos={documentos} />
        )}
        {tab === "resoluciones" && (
          <TabResoluciones resoluciones={resoluciones} />
        )}
        {tab === "partes" && (
          <TabPartes partes={partes} />
        )}
        {tab === "historial" && (
          <TabHistorial historial={historial} />
        )}
      </div>
    </div>
  );
}

// ------- Paneles de cada tab (puedes mejorar según tus modelos) ---------
function TabDocumentos({ documentos = [] }) {
  return (
    <div>
      <h3 className="font-bold mb-2">Archivos vinculados</h3>
      {documentos.length === 0
        ? <div className="text-gray-400">No hay documentos aún.</div>
        : (
          <ul className="space-y-2">
            {documentos.map(doc => (
              <li key={doc.id} className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg shadow-sm">
                <FileText className="text-[#a52e00]" size={20} />
                <span className="flex-1">{doc.nombre}</span>
                <a href={doc.url} target="_blank" rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm">Descargar</a>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}

function TabResoluciones({ resoluciones = [] }) {
  return (
    <div>
      <h3 className="font-bold mb-2">Resoluciones</h3>
      {resoluciones.length === 0
        ? <div className="text-gray-400">No hay resoluciones aún.</div>
        : (
          <ul className="space-y-2">
            {resoluciones.map(res => (
              <li key={res.id} className="bg-gray-50 p-3 rounded-lg shadow-sm">
                <div className="font-semibold">{res.titulo}</div>
                <div className="text-xs text-gray-500 mb-1">{res.fecha}</div>
                <div className="text-sm">{res.detalle}</div>
                {res.archivo &&
                  <a href={res.archivo} target="_blank" rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-xs">Descargar</a>}
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}

function TabPartes({ partes = [] }) {
  return (
    <div>
      <h3 className="font-bold mb-2">Partes procesales</h3>
      {partes.length === 0
        ? <div className="text-gray-400">No hay partes registradas.</div>
        : (
          <ul className="space-y-1">
            {partes.map((parte, idx) => (
              <li key={idx} className="bg-gray-50 rounded px-4 py-2 shadow-sm">
                <b>{parte.tipo}:</b> {parte.nombre}
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}

function TabHistorial({ historial = [] }) {
  return (
    <div>
      <h3 className="font-bold mb-2">Historial de actividad</h3>
      {historial.length === 0
        ? <div className="text-gray-400">No hay historial aún.</div>
        : (
          <ul className="text-xs space-y-1">
            {historial.map((item, idx) => (
              <li key={idx} className="bg-gray-100 px-3 py-2 rounded shadow-sm">
                <b>{item.fecha}:</b> {item.evento}
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}
