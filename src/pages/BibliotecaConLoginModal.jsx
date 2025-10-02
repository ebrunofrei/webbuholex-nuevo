import React from "react";
import { useAuth } from "../context/AuthContext";
import Biblioteca from "./Biblioteca";

export default function BibliotecaConLoginModal() {
  const { user, abrirLogin, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#b03a1a] border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <h2 className="text-xl md:text-2xl font-bold text-[#b03a1a] mb-4">
          Biblioteca Jurídica
        </h2>
        <p className="mb-6 text-gray-700 max-w-md">
          Inicia sesión para acceder a nuestra <b>colección de códigos, jurisprudencia y libros digitales</b>.  
          Registrarte es gratis y te permitirá consultar todos los recursos disponibles.
        </p>
        <button
          onClick={abrirLogin}
          className="bg-[#b03a1a] hover:bg-[#7a2518] text-white px-6 py-3 rounded-lg shadow-md font-semibold transition"
        >
          Iniciar sesión
        </button>
      </div>
    );
  }

  return <Biblioteca />;
}
