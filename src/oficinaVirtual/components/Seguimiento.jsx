const DEMO_RESOLUCIONES = [
  { fecha: "2024-06-10", tipo: "Auto", desc: "Admisorio de demanda" },
  { fecha: "2024-06-21", tipo: "Resolución", desc: "Fija fecha de audiencia" },
  { fecha: "2024-07-05", tipo: "Sentencia", desc: "Declara fundada la demanda" }
];

export default function Seguimiento({ expedienteId }) {
  return (
    <div className="p-3">
      <h3 className="text-lg font-bold mb-4">Seguimiento / Resoluciones</h3>
      <ol className="relative border-l-2 border-[#b03a1a]/30">
        {DEMO_RESOLUCIONES.map((r, i) => (
          <li key={i} className="mb-6 ml-4">
            <div className="absolute w-3 h-3 bg-[#b03a1a] rounded-full mt-1.5 -left-1.5 border"></div>
            <div className="flex items-center gap-3">
              <div className="font-bold text-[#b03a1a]">{r.tipo}</div>
              <div className="text-xs text-gray-500">{r.fecha}</div>
            </div>
            <div className="ml-1 text-gray-700">{r.desc}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}
