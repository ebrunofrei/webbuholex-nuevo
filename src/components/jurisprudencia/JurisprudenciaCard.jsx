import { Eye, Download } from "lucide-react";

export default function JurisprudenciaCard({ data, onVer }) {
  return (
    <div className="rounded-xl border bg-white shadow p-4 flex flex-col justify-between min-h-[140px]">
      <div>
        <div className="text-xs text-gray-500 mb-1">{data.materia} / {data.submateria}</div>
        <div className="font-bold">{data.titulo || data.recurso}</div>
        <div className="text-xs text-gray-400">{data.organo}</div>
      </div>
      <div className="flex gap-2 mt-4">
        <button
          title="Ver documento"
          onClick={() => onVer(data)}
          className="text-blue-600 hover:text-blue-900 transition p-1 rounded-full"
        >
          <Eye size={20} />
        </button>
        {data.pdfUrl && (
          <a
            href={data.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Descargar PDF"
            className="text-green-700 hover:text-green-900 p-1 rounded-full"
            download
          >
            <Download size={20} />
          </a>
        )}
      </div>
    </div>
  );
}
