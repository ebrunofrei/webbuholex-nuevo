import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import logoBuhoLex from "../assets/buho-institucional.png";
import { useAuth } from "../context/AuthContext";

const menu = [
  { label: "Inicio", to: "/" },
  { label: "Servicios", to: "/servicios" },
  { label: "Jurisprudencia", to: "/jurisprudencia" },
  { label: "Códigos", to: "/codigos" },
  { label: "Biblioteca", to: "/biblioteca" },
  { label: "Agenda", to: "/agenda" },
  { label: "Contacto", to: "/contacto" },
];

const getInitials = (name, email) =>
  (name?.split(" ").map(w => w[0]).join("").toUpperCase() || email?.[0]?.toUpperCase() || "?");

export default function SidebarLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen">
      {/* SIDEBAR */}
      <aside
        className={`
          fixed left-0 top-0 h-full z-40 bg-[#b03a1a] flex flex-col items-center py-6 px-2
          w-64 transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:static md:translate-x-0 md:w-56 md:py-8 md:px-4
        `}
      >
        {/* Logo */}
        <Link to="/" className="mb-6 flex items-center gap-2">
          <img src={logoBuhoLex} alt="BúhoLex" className="h-12 w-12 rounded-md shadow" />
          <span className="text-white font-extrabold text-2xl tracking-widest drop-shadow-lg">BúhoLex</span>
        </Link>
        {/* Menú */}
        <nav className="flex flex-col gap-2 w-full">
          {menu.map(({ label, to }) => (
            <Link
              key={to}
              to={to}
              className={`px-4 py-2 rounded-md font-bold text-lg transition ${
                location.pathname === to
                  ? "bg-white text-[#b03a1a] shadow"
                  : "text-white hover:bg-[#fff6e6] hover:text-[#b03a1a]"
              }`}
              onClick={() => setSidebarOpen(false)}
            >
              {label}
            </Link>
          ))}
        </nav>
        {/* Avatar al final */}
        <div className="mt-auto mb-2">
          {user && !user.isAnonymous ? (
            <span className="flex items-center gap-2">
              <span className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-[#b03a1a] font-extrabold text-xl">
                {getInitials(user.displayName, user.email)}
              </span>
            </span>
          ) : (
            <></>
          )}
        </div>
        {/* Botón ocultar en móvil */}
        <button
          className="md:hidden absolute top-4 right-4 text-white text-2xl"
          onClick={() => setSidebarOpen(false)}
        >
          ✖️
        </button>
      </aside>
      {/* Botón mostrar sidebar (sólo en móvil) */}
      {!sidebarOpen && (
        <button
          className="fixed top-4 left-4 z-50 md:hidden bg-[#b03a1a] text-white rounded-full p-2 shadow"
          onClick={() => setSidebarOpen(true)}
        >
          <span className="material-icons">menu</span>
        </button>
      )}
      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10 md:ml-56">
        {children}
      </main>
    </div>
  );
}
