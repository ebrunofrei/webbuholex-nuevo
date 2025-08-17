// src/oficinaVirtual/components/GridArchivos.jsx

const DEMO_DOCS = [
  { id: "DOC1", nombre: "Demanda Civil.pdf", materia: "Civil", año: "2024" },
  { id: "DOC2", nombre: "Sentencia Penal.docx", materia: "Penal", año: "2023" }
];

export default function GridArchivos({ query = "" }) {
  // Filtro seguro usando valores por defecto para evitar errores
  const docs = DEMO_DOCS.filter(d =>
    (d.nombre || "").toLowerCase().includes((query || "").toLowerCase()) ||
    (d.materia || "").toLowerCase().includes((query || "").toLowerCase()) ||
    (d.año || "").toLowerCase().includes((query || "").toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {docs.length === 0 && (
        <div className="text-gray-400 col-span-full">No hay archivos.</div>
      )}
      {docs.map(d => (
        <div
          className="bg-white rounded-lg p-4 shadow flex flex-col gap-2"
          key={d.id}
        >
          <div className="font-semibold">{d.nombre || <span className="text-gray-400">Sin nombre</span>}</div>
          <div className="text-xs text-gray-500">
            Materia: {d.materia || "—"} · Año: {d.año || "—"}
          </div>
          <button className="text-sm text-blue-600 underline">
            Ver / Descargar
          </button>
        </div>
      ))}
    </div>
  );
}
