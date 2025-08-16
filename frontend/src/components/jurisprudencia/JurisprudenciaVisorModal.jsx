import React from "react";

export default function JurisprudenciaVisorModal({ open, onClose, doc }) {
  if (!open || !doc) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl max-w-3xl w-full p-6 shadow-xl relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 bg-gray-200 hover:bg-red-500 hover:text-white rounded-full p-2"
        >✕</button>
        <h2 className="text-xl font-bold mb-2">{doc.titulo || doc.recurso}</h2>
        <div className="mb-2 text-xs text-gray-500">{doc.materia} / {doc.submateria}</div>
        {doc.pdfUrl ? (
          <iframe
            src={doc.pdfUrl}
            title="Documento PDF"
            className="w-full h-[500px] rounded"
          ></iframe>
        ) : (
          <div className="text-gray-400 text-center py-12">No hay PDF disponible</div>
        )}
        {doc.pdfUrl && (
          <a
            href={doc.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block px-4 py-2 bg-blue-700 text-white rounded shadow hover:bg-blue-900"
            download
          >
            Descargar PDF
          </a>
        )}
      </div>
    </div>
  );
}
