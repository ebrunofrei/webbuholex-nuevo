import React, { useState } from "react";
import { Upload, FileText, Download, Eye } from "lucide-react";

export default function BibliotecaJuridica({ documentosIniciales = [] }) {
  const [documentos, setDocumentos] = useState(documentosIniciales);
  const [archivo, setArchivo] = useState(null);
  const [categoria, setCategoria] = useState("codigo");

  // Manejo de archivo seleccionado
  const handleArchivo = (e) => {
    const file = e.target.files[0];
    if (file) setArchivo(file);
  };

  // Simulación de subida
  const handleUpload = () => {
    if (!archivo) return;

    const nuevoDoc = {
      id: Date.now(),
      nombre: archivo.name,
      tipo: categoria,
      año: new Date().getFullYear(),
      url: URL.createObjectURL(archivo), // solo vista local (en prod usar backend/storage)
    };

    setDocumentos([nuevoDoc, ...documentos]);
    setArchivo(null);
  };

  return (
    <section className="rounded-2xl bg-white shadow-lg border border-[#b03a1a]/20 p-6 flex-1 mt-8">
      <h2 className="text-xl font-bold mb-4 text-[#b03a1a] flex items-center gap-2">
        <FileText className="text-[#b03a1a]" size={22} />
        Biblioteca Jurídica
      </h2>

      {/* Subida de archivo */}
      <div className="mb-6 border-2 border-dashed border-[#b03a1a]/40 rounded-xl p-5 flex flex-col items-center justify-center text-center">
        <Upload size={28} className="text-[#b03a1a] mb-2" />
        <p className="text-sm text-gray-600 mb-2">Sube un archivo PDF o DOCX</p>
        <input
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={handleArchivo}
          className="mb-3"
        />
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="border rounded px-3 py-2 text-sm mb-3 focus:ring-2 focus:ring-[#b03a1a]/50"
        >
          <option value="codigo">Código</option>
          <option value="jurisprudencia">Jurisprudencia</option>
          <option value="libro">Libro</option>
        </select>
        <button
          onClick={handleUpload}
          disabled={!archivo}
          className="bg-[#b03a1a] text-white px-5 py-2 rounded-lg shadow hover:bg-[#a87247] transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Subir archivo
        </button>
      </div>

      {/* Listado de documentos */}
      <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documentos.length > 0 ? (
          documentos.map((doc) => (
            <div
              key={doc.id}
              className="rounded-lg border border-gray-200 bg-[#fdfaf9] p-4 shadow-sm flex flex-col justify-between"
            >
              <div className="font-semibold text-[#4b2e19] truncate">
                {doc.nombre}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                Tipo: <span className="font-medium capitalize">{doc.tipo}</span> · {doc.año}
              </div>
              <div className="flex gap-3 mt-3">
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-medium text-[#b03a1a] hover:underline"
                >
                  <Eye size={14} /> Ver
                </a>
                <a
                  href={doc.url}
                  download={doc.nombre}
                  className="flex items-center gap-1 text-xs font-medium text-[#b03a1a] hover:underline"
                >
                  <Download size={14} /> Descargar
                </a>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-sm text-center col-span-full">
            No hay documentos en la biblioteca.
          </p>
        )}
      </div>
    </section>
  );
}
