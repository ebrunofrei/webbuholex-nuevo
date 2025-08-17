import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import logoBuhoLex from "../../assets/buho-institucional.png";
import AuthModal from "./AuthModal";
import { useAuth } from "../../context/AuthContext";
import { Menu, X } from "lucide-react"; // Si no tienes lucide, puedes cambiar por svg

export default function Navbar() {
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const dropdownRef = useRef(null);

  const { user, loading, cerrarSesion } = useAuth();

  // Logout + cerrar menú
  const handleLogout = async () => {
    setShowDropdown(false);
    setMobileMenu(false);
    await cerrarSesion();
  };

  // Cierra dropdown user en desktop
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cierra todo al cambiar ruta
  useEffect(() => {
    setShowAuth(false);
    setShowDropdown(false);
    setMobileMenu(false);
  }, [location.pathname]);

  const menu = [
    { label: "Inicio", to: "/" },
    { label: "Servicios", to: "/servicios" },
    { label: "Jurisprudencia", to: "/jurisprudencia" },
    { label: "Códigos", to: "/codigos" },
    { label: "Biblioteca", to: "/biblioteca" },
    { label: "Contacto", to: "/contacto" },
    { label: "Blog", to: "/blog" }
  ];

  return (
    <nav className="fixed top-0 left-0 w-full z-40 bg-[#b03a1a] shadow-lg border-b-2 border-[#942813]">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-2">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 z-50">
          <img src={logoBuhoLex} alt="BúhoLex" className="h-10 w-10 rounded-md shadow" />
          <span className="text-white font-extrabold text-2xl tracking-widest drop-shadow-lg font-serif">
            BúhoLex
          </span>
        </Link>

        {/* Desktop menú */}
        <div className="hidden md:flex gap-7">
          {menu.map(({ label, to }) => (
            <Link
              key={to}
              to={to}
              className={`px-2 font-semibold tracking-wide transition-colors rounded-md ${
                location.pathname === to
                  ? "bg-white text-[#b03a1a] shadow font-bold"
                  : "text-white hover:bg-[#942813] hover:text-yellow-300"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Mobile: Hamburguesa */}
        <button
          className="md:hidden flex items-center justify-center w-10 h-10 rounded-full hover:bg-[#a52e00]/10 transition z-50"
          onClick={() => setMobileMenu(true)}
          aria-label="Abrir menú"
        >
          <Menu className="text-white w-7 h-7" />
        </button>

        {/* Usuario / Loader / Login en desktop */}
        <div className="relative hidden md:block" ref={dropdownRef}>
          {loading ? (
            <span className="w-10 h-10 flex items-center justify-center animate-spin text-yellow-400">⏳</span>
          ) : user ? (
            <>
              <button
                className="flex items-center gap-2 px-2 py-1 rounded-full bg-yellow-400 font-bold shadow hover:bg-yellow-300 transition"
                onClick={() => setShowDropdown((v) => !v)}
                aria-label="Mi cuenta"
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <span className="w-8 h-8 flex items-center justify-center rounded-full bg-yellow-300 text-[#b03a1a] text-lg uppercase">
                    {(user.displayName?.charAt(0) || user.email?.charAt(0) || "U")}
                  </span>
                )}
                <span className="hidden md:block max-w-[120px] truncate">{user.displayName || user.email}</span>
              </button>
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-lg py-2 z-50 animate-fade-in">
                  <button
                    className="w-full px-4 py-2 text-[#b03a1a] hover:bg-[#ffe6e6] text-left font-semibold"
                    onClick={handleLogout}
                  >
                    Cerrar sesión
                  </button>
                  {/* Más opciones aquí */}
                </div>
              )}
            </>
          ) : (
            <>
              <button
                className="px-5 py-2 rounded-full border bg-white text-[#b03a1a] font-bold shadow transition hover:bg-[#fff7e6] hover:text-[#a52e00] text-base"
                onClick={() => setShowAuth(true)}
              >
                Iniciar sesión / Registrarse
              </button>
              {showAuth && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                  <div className="relative">
                    <AuthModal open={true} onClose={() => setShowAuth(false)} />
                    <button
                      className="absolute -top-6 -right-6 text-3xl text-white bg-[#b03a1a] hover:bg-[#942813] rounded-full px-2 py-0.5 shadow focus:outline-none"
                      onClick={() => setShowAuth(false)}
                      aria-label="Cerrar modal"
                    >×</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ===== Mobile menu lateral ===== */}
      {mobileMenu && (
        <div className="fixed inset-0 z-50 flex">
          {/* Fondo oscuro */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileMenu(false)}
          />
          {/* Sidebar */}
          <div className="relative w-64 bg-[#b03a1a] h-full flex flex-col p-6 gap-4 animate-slideInLeft z-50 shadow-2xl">
            <button
              className="absolute top-3 right-4 text-3xl text-white hover:text-yellow-400"
              onClick={() => setMobileMenu(false)}
              aria-label="Cerrar menú"
            >
              <X />
            </button>
            <Link to="/" className="flex items-center gap-2 mb-8" onClick={() => setMobileMenu(false)}>
              <img src={logoBuhoLex} alt="BúhoLex" className="h-9 w-9 rounded shadow" />
              <span className="text-white font-extrabold text-xl tracking-widest font-serif">
                BúhoLex
              </span>
            </Link>
            {menu.map(({ label, to }) => (
              <Link
                key={to}
                to={to}
                className={`px-2 py-2 rounded-md font-semibold text-lg ${
                  location.pathname === to
                    ? "bg-white text-[#b03a1a] shadow"
                    : "text-white hover:bg-[#942813] hover:text-yellow-300"
                }`}
                onClick={() => setMobileMenu(false)}
              >
                {label}
              </Link>
            ))}
            <div className="mt-10 border-t border-[#fff7e6] pt-6">
              {loading ? (
                <span className="w-8 h-8 flex items-center justify-center animate-spin text-yellow-300">⏳</span>
              ) : user ? (
                <button
                  className="w-full flex items-center gap-3 px-4 py-2 bg-yellow-400 rounded-full shadow text-[#b03a1a] font-bold text-base hover:bg-yellow-300 transition mb-2"
                  onClick={handleLogout}
                >
                  <span>
                    {user.displayName?.charAt(0) || user.email?.charAt(0) || "U"}
                  </span>
                  <span className="truncate">{user.displayName || user.email}</span>
                  <span className="ml-auto text-sm text-[#a52e00]">Cerrar sesión</span>
                </button>
              ) : (
                <button
                  className="w-full flex items-center justify-center px-4 py-2 bg-white rounded-full shadow text-[#b03a1a] font-bold text-base hover:bg-[#fff7e6] hover:text-[#a52e00] transition"
                  onClick={() => {
                    setShowAuth(true);
                    setMobileMenu(false);
                  }}
                >
                  Iniciar sesión / Registrarse
                </button>
              )}
            </div>
          </div>
          {/* Anima el sidebar */}
          <style>{`
            @keyframes slideInLeft {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(0); }
            }
            .animate-slideInLeft {
              animation: slideInLeft 0.32s cubic-bezier(.4,1.4,.7,1.01);
            }
          `}</style>
        </div>
      )}

      {/* Auth modal global (para mobile) */}
      {showAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="relative">
            <AuthModal open={true} onClose={() => setShowAuth(false)} />
            <button
              className="absolute -top-6 -right-6 text-3xl text-white bg-[#b03a1a] hover:bg-[#942813] rounded-full px-2 py-0.5 shadow focus:outline-none"
              onClick={() => setShowAuth(false)}
              aria-label="Cerrar modal"
            >×</button>
          </div>
        </div>
      )}
    </nav>
  );
}
