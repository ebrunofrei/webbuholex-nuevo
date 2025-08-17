import React from "react";
// Si usas íconos externos, importa aquí, si no, deja los emojis actuales

const CARDS = [
  {
    nombre: "Casilla de Expedientes",
    icono: "📂",
    descripcion: "Accede a todos tus expedientes judiciales y administrativos.",
    route: "/oficinaVirtual/casilla-expedientes",
    novedades: 2, // Ejemplo de archivos pendientes
  },
  {
    nombre: "Casilla de Resoluciones",
    icono: "📝",
    descripcion: "Revisa autos, decretos, sentencias y resoluciones administrativas.",
    route: "/oficinaVirtual/casilla-resoluciones",
    novedades: 0,
  },
  {
    nombre: "Agenda de Audiencias",
    icono: "🗓️",
    descripcion: "Consulta y administra tus próximas audiencias.",
    route: "/oficinaVirtual/agenda",
    novedades: 1,
  },
  {
    nombre: "Notificaciones",
    icono: "🔔",
    descripcion: "Revisa tus notificaciones electrónicas recibidas.",
    route: "/oficinaVirtual/notificaciones",
    novedades: 3,
  }
];

export default function Oficina() {
  return (
    <section className="w-full min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-8 text-[#b03a1a]">Oficina Virtual</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
        {CARDS.map((card) => (
          <a
            key={card.nombre}
            href={card.route}
            className="relative bg-white rounded-xl shadow p-8 hover:shadow-lg transition flex flex-col items-center"
          >
            <span className="text-5xl mb-4">{card.icono}</span>
            <div className="text-lg font-bold mb-1 text-center">{card.nombre}</div>
            <div className="text-gray-600 text-sm text-center">{card.descripcion}</div>
            {card.novedades > 0 && (
              <span className="absolute top-4 right-4 bg-red-600 text-white text-xs rounded-full px-2 py-0.5">
                {card.novedades}
              </span>
            )}
          </a>
        ))}
      </div>
    </section>
  );
}
