// src/pages/LitisBotHerramientasDemo.jsx (o en tu página de chat)
import React, { useState } from "react";
import ModalHerramientas from "@/components/ModalHerramientas";

export default function LitisBotHerramientasDemo() {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [herramienta, setHerramienta] = useState(null);
  const [error, setError] = useState("");
  const pro = false; // Cambia a true para habilitar todas las funciones

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <button
        onClick={() => setModalAbierto(true)}
        className="px-8 py-4 bg-yellow-700 text-white rounded-xl text-xl mb-8"
      >
        Abrir Herramientas LitisBot
      </button>
      {/* Aquí va tu chat, etc. */}
      <ModalHerramientas
        open={modalAbierto}
        onClose={() => {
          setModalAbierto(false);
          setHerramienta(null);
          setError("");
        }}
        pro={pro}
        herramienta={herramienta}
        setHerramienta={setHerramienta}
        error={error}
        setError={setError}
      />
    </div>
  );
}
