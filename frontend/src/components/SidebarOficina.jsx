import React from "react";
import { Briefcase, Calendar, FileText, Bell, Book, Settings } from "lucide-react";

export default function SidebarOficina() {
  // Puedes agregar lógica de rutas activas según tu router
  return (
    <aside className="w-60 bg-white border-r min-h-[calc(100vh-64px)] flex flex-col pt-6 shadow-sm">
      <nav className="flex flex-col gap-3">
        <SidebarLink to="/oficina/expedientes" icon={<Briefcase size={20} />} label="Expedientes" />
        <SidebarLink to="/oficina/agenda" icon={<Calendar size={20} />} label="Agenda & Calendario" />
        <SidebarLink to="/oficina/documentos" icon={<FileText size={20} />} label="Documentos" />
        <SidebarLink to="/oficina/notificaciones" icon={<Bell size={20} />} label="Notificaciones" />
        <SidebarLink to="/oficina/biblioteca" icon={<Book size={20} />} label="Biblioteca" />
        <SidebarLink to="/oficina/configuracion" icon={<Settings size={20} />} label="Configuración" />
      </nav>
      <div className="flex-1" />
    </aside>
  );
}

function SidebarLink({ to, icon, label }) {
  return (
    <a
      href={to}
      className="flex items-center px-6 py-2 text-[#b03a1a] hover:bg-[#fff6e6] rounded-r-full transition"
    >
      <span className="mr-3">{icon}</span>
      {label}
    </a>
  );
}
