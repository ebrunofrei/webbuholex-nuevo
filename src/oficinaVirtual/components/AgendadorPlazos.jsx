import React, { useState } from "react";
import { sendChatMessage } from "@/services/chatClient.js";

/**
 * 🗓️ AgendadorPlazos — FRONTEND CANÓNICO
 * ------------------------------------
 * - NO crea eventos directamente
 * - NO Google Calendar
 * - NO Firebase
 * - Traduce intención humana → IA
 * - La agenda se crea en backend (Agenda Responder)
 */

export default function AgendadorPlazos({ usuarioId, expedienteId }) {
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleAgendar = async (e) => {
    e.preventDefault();
    if (!texto.trim()) return;

    setCargando(true);
    try {
      await enviarMensajeIA({
        usuarioId,
        expedienteId,
        prompt: texto,
      });

      setTexto("");
    } catch (err) {
      alert(err.message || "Error al enviar a la agenda");
    } finally {
      setCargando(false);
    }
  };

  return (
    <form
      onSubmit={handleAgendar}
      className="bg-white rounded-xl shadow-lg p-5 flex flex-col gap-4"
    >
      <h2 className="font-bold text-lg text-[#a52a2a]">
        Agendar evento / audiencia
      </h2>

      <textarea
        className="textarea textarea-bordered"
        placeholder='Ej: "Audiencia de conciliación el viernes a las 9 am"'
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={4}
        required
      />

      <button
        type="submit"
        className="btn btn-primary"
        disabled={cargando}
      >
        {cargando ? "Procesando…" : "Enviar a agenda"}
      </button>
    </form>
  );
}
