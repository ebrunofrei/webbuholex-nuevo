import React from "react";
import { useGoogleAuth } from "@/context/GoogleAuthContext";
import AgendaProfesional from "../components/AgendaProfesional"; // Ajusta la ruta si es necesario

export default function Agenda({ user, expedienteId }) {
  const { token, profile, login, logout } = useGoogleAuth();

  return (
    <div className="flex flex-col md:flex-row gap-8 p-6">
      <div className="flex-1">
        {/* Botón superior */}
        {!token ? (
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded mb-4"
            onClick={login}
          >
            Conectar Google Calendar
          </button>
        ) : (
          <div className="flex items-center gap-4 mb-4">
            <img src={profile?.picture} alt="" className="w-9 h-9 rounded-full border" />
            <span className="text-green-700 font-medium">{profile?.name || "Conectado"}</span>
            <button
              className="ml-2 text-xs bg-gray-200 rounded px-2 py-1 hover:bg-red-200"
              onClick={logout}
            >
              Desconectar
            </button>
          </div>
        )}

        {/* Tu agenda interna */}
        <AgendaProfesional user={user} expedienteId={expedienteId} />
      </div>

      {/* Aquí puedes poner otra columna, como un agendador de plazos, resumen, etc. */}
      {/* <AgendadorPlazos ... /> */}
    </div>
  );
}
