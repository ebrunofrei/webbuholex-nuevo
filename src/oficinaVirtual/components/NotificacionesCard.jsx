import React from "react";
import { useNavigate } from "react-router-dom";

export default function NotificacionesCard({ notificaciones }) {
  const navigate = useNavigate();
  return (
    <section className="rounded-2xl bg-white shadow-lg border border-[#F4D35E]/30 p-5 flex-1 mt-8">
      <h2 className="text-lg font-bold mb-3 text-[#D4AF37] flex items-center gap-2">
        <span className="inline-block w-2 h-5 rounded bg-[#D4AF37] mr-2" />
        Últimas Notificaciones
      </h2>
      <div className="flex flex-col gap-3">
        {notificaciones.map((n, i) => (
          <div
            key={i}
            className="rounded-xl border border-[#F4D35E]/40 bg-[#fcf8e3] p-3 flex items-center gap-3"
          >
            <span className="text-[#D4AF37] text-xl">⚠️</span>
            <div className="flex-1">
              <div className="text-xs font-bold text-[#b03a1a]">{n.tipo}</div>
              <div className="text-sm">{n.msg}</div>
            </div>
            <div className="text-xs text-gray-500">{n.fecha}</div>
          </div>
        ))}
      </div>
      <button
        onClick={() => navigate("/oficinaVirtual/notificaciones")}
        className="block mt-3 text-sm text-[#D4AF37] font-bold hover:underline ml-1"
      >
        Ver todas las notificaciones →
      </button>
    </section>
  );
}
