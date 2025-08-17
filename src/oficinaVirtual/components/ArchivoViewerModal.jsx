import React from "react";
import { X, BotMessageSquare } from "lucide-react";
import { useLitisBot } from "@/context/LitisBotContext.jsx";

export default function ArchivoViewerModal({ archivo, onClose }) {
  const { abrirBot } = useLitisBot();

  if (!archivo) return null;

  const renderContenido = () => {
    const tipo = archivo.tipo || "";
    if (tipo.includes("pdf")) {
      return <iframe src={archivo.url} title="PDF" className="w-full h-[80vh]" />;
    } else if (tipo.includes("image")) {
      return <img src={archivo.url} alt={archivo.nombre} className="max-w-full max-h-[80vh] mx-auto" />;
    } else if (tipo.includes("audio")) {
      return <audio controls src={archivo.url} className="w-full mt-4" />;
    } else if (tipo.includes("video")) {
      return <video controls src={archivo.url} className="w-full max-h-[80vh]" />;
    } else if (tipo.includes("word") || tipo.includes("doc")) {
      return (
        <iframe
          src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(archivo.url)}`}
          className="w-full h-[80vh]"
          title="Word Viewer"
        />
      );
    } else {
      return <p className="text-gray-500">No se puede previsualizar este tipo de archivo.</p>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-xl w-[90%] max-w-4xl p-4 relative shadow-lg">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-red-600"
          title="Cerrar visor"
        >
          <X size={20} />
        </button>

        <h2 className="text-lg font-bold mb-4 text-[#b03a1a]">{archivo.nombre}</h2>

        <div className="mb-6">{renderContenido()}</div>

        <div className="text-right">
          <button
            onClick={() => abrirBot({ archivo, expediente: archivo.expedienteId })}
            className="flex items-center gap-2 px-4 py-2 bg-[#b03a1a] text-white rounded hover:bg-[#a02a0a]"
          >
            <BotMessageSquare size={18} /> Analizar con LitisBot
          </button>
        </div>
      </div>
    </div>
  );
}
