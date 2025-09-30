// src/pages/HistorialChat.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { obtenerHistorialLitisBot } from "@services/firebaseLitisBotService";

export default function HistorialChat() {
  const { user } = useAuth();
  const [historial, setHistorial] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const cargar = async () => {
      if (!user || !user.uid) return;
      setLoading(true);
      setError("");
      try {
        const datos = await obtenerHistorialLitisBot(user.uid);
        setHistorial(datos || []);
      } catch (err) {
        console.error("Error al cargar historial:", err);
        setError("No se pudo cargar el historial. Intenta nuevamente.");
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [user]);

  const filtrados = historial.filter(
    (m) =>
      m.content?.toLowerCase().includes(busqueda.toLowerCase()) ||
      m.role?.toLowerCase().includes(busqueda.toLowerCase())
  );

  // Exportar como TXT
  const exportarHistorial = () => {
    const data = filtrados.map(
      (m) =>
        `[${m.role === "assistant" ? "LitisBot" : "Tú"}] ${
          m.content || ""
        }\n(${m.timestamp ? new Date(m.timestamp).toLocaleString() : ""})`
    );
    const blob = new Blob([data.join("\n\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "historial-litisbot.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold text-[#b03a1a] mb-4">
        Historial de chats con LitisBot
      </h1>

      {/* Barra de búsqueda + exportar */}
      <div className="flex flex-col md:flex-row items-center gap-3 mb-5">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar mensaje, palabra clave o tipo..."
          className="flex-1 border px-3 py-2 rounded text-[#4b2e19]"
        />
        <button
          onClick={exportarHistorial}
          disabled={filtrados.length === 0}
          className="bg-[#b03a1a] text-white rounded-xl px-6 py-2 font-bold hover:bg-[#a52e00] transition disabled:opacity-40"
        >
          Exportar historial
        </button>
      </div>

      {loading && (
        <div className="text-[#b03a1a] font-bold my-8">Cargando historial...</div>
      )}

      {error && (
        <div className="text-red-600 font-medium my-8">{error}</div>
      )}

      {!loading && !error && filtrados.length === 0 && (
        <div className="text-[#4b2e19] font-medium my-8">
          No hay mensajes en el historial.
        </div>
      )}

      {/* Mensajes */}
      <div className="space-y-4">
        {filtrados.map((msg, i) => (
          <div
            key={msg.id || i}
            className={`p-4 rounded-xl shadow border flex gap-4 items-start ${
              msg.role === "assistant"
                ? "bg-white border-[#e5c9b2]"
                : "bg-[#fde7e7] border-[#b03a1a]"
            }`}
          >
            {/* Avatar */}
            <span
              className="flex items-center justify-center rounded-full"
              style={{
                width: 38,
                height: 38,
                minWidth: 38,
                minHeight: 38,
                background: msg.role === "assistant" ? "#fff" : "#b03a1a",
                color: msg.role === "assistant" ? "#b03a1a" : "#fff",
                fontWeight: 800,
                fontSize: 19,
              }}
            >
              {msg.role === "assistant" ? "🦉" : "Tú"}
            </span>

            {/* Contenido */}
            <div className="flex-1">
              <div className="font-semibold mb-1 text-[#4b2e19]">
                {msg.role === "assistant" ? "LitisBot" : "Tú"}
                <span className="ml-2 text-xs text-[#b03a1a]">
                  {msg.timestamp &&
                    new Date(msg.timestamp).toLocaleString()}
                </span>
              </div>
              <div className="whitespace-pre-line text-[#4b2e19]">
                {msg.content}
              </div>
            </div>

            {/* Favorito */}
            <span
              title={msg.favorito ? "Favorito" : "Marcar como favorito"}
              className="cursor-pointer select-none"
              style={{
                color: msg.favorito ? "#b03a1a" : "#c2b2ad",
                fontSize: 25,
              }}
              // 🔜 Aquí puedes conectar lógica para marcar como favorito
            >
              ★
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
