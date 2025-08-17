// src/components/BotonLogout.jsx
import React from "react";
import { signOut } from "firebase/auth";
import { auth } from "../services/firebaseConfig";
import { useNavigate } from "react-router-dom";

export default function BotonLogout() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    setShowDropdown(false);
    await cerrarSesion();
  };

  return (
    <button
      className="w-full px-4 py-2 text-[#b03a1a] hover:bg-[#ffe6e6] text-left font-semibold"
      onClick={handleLogout}
    >
      Cerrar sesión
    </button>
  );
}
