import React from "react";
import { Link, useLocation } from "react-router-dom";
import buhoLogo from "../assets/buho-institucional.png";

// Menú de la Oficina Virtual
const menu = [
  { label: "Oficina", icon: "🏛️", to: "/oficinaVirtual" },
  { label: "Biblioteca", icon: "📚", to: "/oficinaVirtual/biblioteca" },
  { label: "Agenda", icon: "🗓️", to: "/oficinaVirtual/agenda" },
  { label: "Firmar Escrito PDF", icon: "✍️", to: "/oficinaVirtual/firmar-escrito" }, // Nuevo acceso destacado
  { label: "Noticias", icon: "📢", to: "/oficinaVirtual/noticias" },
  { label: "Hazte conocido", icon: "🌟", to: "/oficinaVirtual/hazte-conocido" },
  // Calculadora Laboral - nuevo ítem destacado
  { label: "Calculadora Laboral", icon: "🧮", to: "/oficinaVirtual/calculadora-laboral" },
  { label: "Mi Perfil", icon: "👤", to: "/oficinaVirtual/perfil" },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 min-h-screen bg-[#fef6f2] border-r px-5 py-6 flex flex-col items-center">
      <img src={buhoLogo} alt="Logo" className="w-16 h-16 mb-2 rounded-xl" />
      <div className="font-bold text-[#b03a1a] text-lg mb-1">BúhoLex</div>
      <div className="text-xs text-gray-400 mb-8">Oficina Virtual</div>
      <nav className="flex-1 w-full">
        {menu.map(({ label, icon, to }) => (
          <Link
            key={to}
            to={to}
            className={`flex items-center gap-2 py-2 px-3 rounded-lg mb-1 font-semibold transition ${
              location.pathname === to
                ? "bg-[#ffe5dc] text-[#b03a1a] shadow"
                : "text-gray-700 hover:bg-[#fff7f3] hover:text-[#b03a1a]"
            }`}
          >
            <span className="text-xl">{icon}</span>
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <div className="w-full mt-6">
        <button
          onClick={() => window.location.href = "/"}
          className="w-full text-sm bg-white border border-[#b03a1a] text-[#b03a1a] px-4 py-2 rounded-lg hover:bg-[#ffe5dc] mb-2"
        >
          Ir al Home público
        </button>
        <button
          className="w-full text-sm bg-[#b03a1a] text-white px-4 py-2 rounded-lg hover:bg-[#a87247]"
          onClick={() => { /* lógica de logout */ }}
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
