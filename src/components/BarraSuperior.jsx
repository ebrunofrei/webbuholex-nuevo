import React from "react";
import logoBuhoLex from "../assets/buho-institucional.png";

export default function BarraSuperior() {
  return (
    <header className="bg-[#b03a1a] h-16 shadow flex items-center px-6 z-50">
      <img src={logoBuhoLex} alt="BúhoLex" className="h-10 w-10 mr-4 rounded" />
      <span className="text-white font-extrabold text-2xl tracking-widest drop-shadow-lg">BúhoLex</span>
      <nav className="ml-8 flex gap-7">
        <a href="/oficina" className="text-white hover:underline">Escritorio</a>
        <a href="/oficina/expedientes" className="text-white hover:underline">Expedientes</a>
        <a href="/oficina/biblioteca" className="text-white hover:underline">Biblioteca</a>
        <a href="/oficina/agenda" className="text-white hover:underline">Agenda</a>
      </nav>
      <div className="ml-auto flex items-center gap-3">
        {/* Notificaciones, avatar, menú user */}
        <span className="bg-white text-[#b03a1a] px-3 py-1 rounded-full font-semibold mr-2">Eduardo</span>
        <span className="bg-[#a52e00] text-white px-2 py-1 rounded text-xs">Premium</span>
      </div>
    </header>
  );
}
