const DEMO_NOTIFICACIONES = [
  { fecha: "2024-07-03", tipo: "Expediente", texto: "Nuevo archivo subido en 2024-0154" },
  { fecha: "2024-07-03", tipo: "Agenda", texto: "Audiencia programada para 10/07/2024" },
  { fecha: "2024-07-02", tipo: "LitisBot", texto: "Sugerencia agregada a favoritos" }
];

export default function Notificaciones() {
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-5">🔔 Notificaciones</h2>
      <div className="space-y-4">
        {DEMO_NOTIFICACIONES.map((n, i) => (
          <div key={i} className="bg-white rounded-xl shadow p-4 flex justify-between">
            <div>
              <div className="font-bold text-[#b03a1a]">{n.tipo}</div>
              <div className="text-gray-700">{n.texto}</div>
            </div>
            <div className="text-xs text-gray-400">{n.fecha}</div>
          </div>
        ))}
      </div>
      <div className="mt-6 text-xs text-gray-400">Pronto: integración con Telegram y recordatorios automáticos.</div>
    </div>
  );
}
