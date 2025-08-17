import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Briefcase, Calendar, FileText, Bell, Book, Settings, User, Bot, Newspaper, Star, LogOut, Home
} from "lucide-react";
import { Calculator } from "lucide-react";
import buhoLogo from "@/assets/buho-institucional.png";
// Importa tu contexto de autenticación si lo tienes:
// import { useAuth } from "@/context/AuthContext";

export default function SidebarUnificado() {
  const location = useLocation();
  // const { logout } = useAuth(); // <-- descomenta si tienes lógica de logout

  const isVirtual = location.pathname.startsWith("/oficinaVirtual");

  const menu = isVirtual
    ? [
        { label: "Oficina", icon: <Home size={18} />, to: "/oficinaVirtual" },
        { label: "Biblioteca", icon: <Book size={18} />, to: "/oficinaVirtual/biblioteca" },
        { label: "Agenda", icon: <Calendar size={18} />, to: "/oficinaVirtual/agenda" },
        { label: "LitisBot", icon: <Bot size={18} />, to: "/oficinaVirtual/litisbot" },
        { label: "Hazte conocido", icon: <Star size={18} />, to: "/oficinaVirtual/hazte-conocido" },
        { label: "Calculadora Laboral", icon: <Calculator size={18} />, to: "/oficinaVirtual/calculadora-laboral" },
        { label: "Mi Perfil", icon: <User size={18} />, to: "/oficinaVirtual/perfil" },
      ]
    : [
        { label: "Expedientes", icon: <Briefcase size={20} />, to: "/oficina/expedientes" },
        { label: "Agenda & Calendario", icon: <Calendar size={20} />, to: "/oficina/agenda" },
        { label: "Documentos", icon: <FileText size={20} />, to: "/oficina/documentos" },
        { label: "Notificaciones", icon: <Bell size={20} />, to: "/oficina/notificaciones" },
        { label: "Biblioteca", icon: <Book size={20} />, to: "/oficina/biblioteca" },
        { label: "Configuración", icon: <Settings size={20} />, to: "/oficina/configuracion" },
      ];

  return (
    <aside className="w-64 min-h-screen bg-[#fef6f2] border-r px-5 py-6 flex flex-col items-center">
      <img src={buhoLogo} alt="Logo BúhoLex" className="w-16 h-16 mb-2 rounded-xl" />
      <div className="font-bold text-[#b03a1a] text-lg mb-1">BúhoLex</div>
      <div className="text-xs text-gray-400 mb-8">
        {isVirtual ? "Oficina Virtual" : "Oficina Profesional"}
      </div>
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
            aria-current={location.pathname === to ? "page" : undefined}
          >
            <span>{icon}</span>
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
          onClick={() => {
            // logout(); // <-- Si tienes función de logout, descomenta esta línea
            window.location.href = "/login"; // Opcional: redirigir a login
          }}
        >
          <LogOut size={16} className="inline mr-2" /> Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
