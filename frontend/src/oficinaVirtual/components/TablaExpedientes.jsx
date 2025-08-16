import React, { useRef } from "react";
import html2canvas from "html2canvas";
import { Eye, FilePlus, Bot } from "lucide-react";

// Definición de columnas por tipo de expediente
const columnasPorTipo = {
  judicial: [
    { label: "Nº Expediente", key: "numero" },
    { label: "Órgano Jurisdiccional", key: "organo" },
    { label: "Materia", key: "materia" },
    { label: "Juez", key: "juez" },
    { label: "Especialista", key: "especialista" },
    { label: "Demandante / Denunciante", key: "demandante" },
    { label: "Demandado / Denunciado", key: "demandado" },
  ],
  administrativo: [
    { label: "Nº Expediente", key: "numero" },
    { label: "Entidad", key: "entidad" },
    { label: "Materia", key: "materia" },
    { label: "Funcionario Responsable", key: "funcionario" },
    { label: "Estado / Seguimiento", key: "estado" },
    { label: "Cliente", key: "cliente" },
  ]
};

export default function TablaExpedientes({
  expedientes = [],
  tipo = "judicial",
  onEditarCampo,
  onSubirArchivo,
  onVerExpediente,
  onOrganizarLitisBot
}) {
  const tableRef = useRef();
  const columnas = columnasPorTipo[tipo] || columnasPorTipo.judicial;

  // Descargar tabla como imagen
  const handleDescargarImagen = async () => {
    if (!tableRef.current) return;
    const canvas = await html2canvas(tableRef.current, { backgroundColor: "#fff" });
    const link = document.createElement("a");
    link.download = `expedientes-${tipo}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="overflow-x-auto rounded-xl shadow border bg-white">
      <button
        className="mb-4 px-4 py-2 bg-blue-700 text-white rounded shadow"
        onClick={handleDescargarImagen}
      >
        Descargar Tabla en PNG
      </button>
      <div ref={tableRef}>
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-[#b03a1a] uppercase text-left">
            <tr>
              <th className="p-3">#</th>
              {columnas.map(col => (
                <th key={col.key} className="p-3">{col.label}</th>
              ))}
              <th className="p-3 text-center">Archivos</th>
              <th className="p-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {expedientes.length === 0 && (
              <tr>
                <td colSpan={columnas.length + 3} className="p-6 text-center text-gray-400">
                  No hay expedientes en esta categoría.
                </td>
              </tr>
            )}
            {expedientes.map((exp, idx) => (
              <tr key={exp.id} className="border-t hover:bg-gray-50">
                <td className="p-3">{idx + 1}</td>
                {columnas.map(col => (
                  <td key={col.key} className="p-3">
                    <input
                      className="border rounded px-1 w-full"
                      value={exp[col.key] || ""}
                      onChange={e => onEditarCampo(exp.id, col.key, e.target.value)}
                    />
                  </td>
                ))}
                {/* Subida y listado de archivos */}
                <td className="p-3 text-center">
                  <input
                    type="file"
                    className="hidden"
                    id={`file-input-${exp.id}`}
                    onChange={e => {
                      const file = e.target.files[0];
                      if (file) onSubirArchivo(exp.id, file);
                    }}
                  />
                  <label htmlFor={`file-input-${exp.id}`} className="cursor-pointer text-[#b03a1a] hover:underline mr-2" title="Subir archivo">
                    <FilePlus size={19} />
                  </label>
                  {exp.archivos && exp.archivos.length > 0 && (
                    <div className="mt-1 text-xs">
                      {exp.archivos.map((a, i) =>
                        <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="block text-blue-700 hover:underline">{a.nombre}</a>
                      )}
                    </div>
                  )}
                </td>
                <td className="p-3 text-center flex gap-2 justify-center">
                  {/* Organizar/Analizar con LitisBot */}
                  <button
                    className="bg-blue-500 text-white px-2 py-1 rounded flex items-center gap-1 text-xs"
                    title="Organizar campos con LitisBot"
                    onClick={() => onOrganizarLitisBot(exp.id)}
                  >
                    <Bot size={16} /> Organizar
                  </button>
                  {/* Ver expediente */}
                  <button
                    className="text-blue-700 hover:text-blue-900 p-2 rounded"
                    title="Ver expediente"
                    onClick={() => onVerExpediente(exp)}
                  >
                    <Eye size={19} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
