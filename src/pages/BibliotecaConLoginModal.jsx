import React from "react";
import { useAuth } from "../context/AuthContext";
import Biblioteca from "./Biblioteca";

export default function BibliotecaConLoginModal() {
  const { user, abrirLogin } = useAuth();
  if (!user) {
    return (
      <div className="text-center p-10">
        <p>Inicia sesión para acceder a la Biblioteca Jurídica.</p>
        <button onClick={abrirLogin} className="bg-[#a52e00] text-white px-4 py-2 rounded shadow">
          Iniciar sesión
        </button>
      </div>
    );
  }
  return <Biblioteca />;
}
