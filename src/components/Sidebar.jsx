import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import buhoLogo from "../assets/buho-institucional.png";

const menu = [
  { label: "Oficina", icon: "🏛️", to: "/oficinaVirtual" },
  { label: "Biblioteca", icon: "📚", to: "/oficinaVirtual/biblioteca" },
  { label: "Agenda", icon: "🗓️", to: "/oficinaVirtual/agenda" },
  { label: "Firmar Escrito PDF", icon: "✍️", to: "/oficinaVirtual/firmar-escrito" },
  { label: "Noticias", icon: "📢", to: "/oficinaVirtual/noticias" },
  { label: "Hazte conocido", icon: "🌟", to: "/oficinaVirtual/hazte-conocido" },
  { label: "Calculadora Laboral", icon: "🧮", to: "/oficinaVirtual/calculadora-laboral" },
  { label: "Mi Perfil", icon: "👤", to: "/oficinaVirtual/perfil" },
];

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      {/* Botón abrir en móvil */}
      {!open && (
        <button
          className="fixed top-4 left-4 z-50 md:hidden bg-[#b03a1a] text-white p-2 rounded-full shadow"
          onClick={() => setOpen(true)}
        >
          ☰
        </button>
      )}

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-[#fef6f2] border-r px-5 py-6 flex flex-col items-center z-50 transform transition-transform duration-300
        ${open ? "translate-x-0 pointer-events-auto" : "-translate-x-full pointer-events-none"}
        md:static md:translate-x-0 md:pointer-events-auto`}
      >
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
              onClick={() => setOpen(false)}
            >
              <span className="text-xl">{icon}</span>
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="w-full mt-6">
          <button
            onClick={() => (window.location.href = "/")}
            className="w-full text-sm bg-white border border-[#b03a1a] text-[#b03a1a] px-4 py-2 rounded-lg hover:bg-[#ffe5dc] mb-2"
          >
            Ir al Home público
          </button>
          <button
            className="w-full text-sm bg-[#b03a1a] text-white px-4 py-2 rounded-lg hover:bg-[#a87247]"
          >
            Cerrar sesión
          </button>
        </div>

        {/* Botón cerrar en móvil */}
        <button
          className="md:hidden absolute top-4 right-4 text-[#b03a1a] text-2xl"
          onClick={() => setOpen(false)}
        >
          ✖️
        </button>
      </aside>
    </>
  );
}
