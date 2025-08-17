import React, { useEffect, useRef, useState } from "react";
import buhoLogo from "../assets/buho-institucional.png";

// Si quieres persistir historial entre sesiones, usa localStorage
const STORAGE_KEY = "litisbot_historial_chat";

export default function LitisBot({ modoModal }) {
  const [input, setInput] = useState("");
  const [mensajes, setMensajes] = useState(() =>
    JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
  );
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const chatRef = useRef(null);

  // Scroll automático al último mensaje
  useEffect(() => {
    chatRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes.length]);

  // Guardar historial en localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mensajes));
  }, [mensajes]);

  // Evento global para recibir texto de otras partes (por ejemplo OCR)
  useEffect(() => {
    const handler = (e) => {
      setInput(e.detail || "");
    };
    window.addEventListener("analizarLitisBot", handler);
    return () => window.removeEventListener("analizarLitisBot", handler);
  }, []);

  // Llama a la API (simulado, reemplaza por tu endpoint real)
  async function analizarTexto() {
    if (!input.trim()) return;
    setEnviando(true);
    setError("");
    setMensajes(msgs => [
      ...msgs,
      { remitente: "user", texto: input }
    ]);
    setInput("");
    try {
      // Simulación de petición a backend o IA
      const res = await fetch("https://run.mocky.io/v3/0de721ef-d0e5-44d3-bd37-ff5ff123b384", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consulta: input })
      });
      if (!res.ok) throw new Error("Error en el análisis legal.");
      const data = await res.json();
      setMensajes(msgs => [
        ...msgs,
        { remitente: "bot", texto: data.respuesta || "Sin respuesta" }
      ]);
    } catch (err) {
      setError("Ocurrió un error con LitisBot. Intenta nuevamente.");
    }
    setEnviando(false);
  }

  // UI del chat legal
  return (
    <div className={`w-full max-w-lg mx-auto flex flex-col h-[440px]`}>
      {/* Cabecera solo si se muestra como modal */}
      {!modoModal && (
        <div className="flex items-center justify-center gap-2 my-4">
          <img src={buhoLogo} alt="LitisBot" className="w-12 h-12" />
          <span className="font-bold text-xl text-[#b03a1a]">LitisBot Chat</span>
        </div>
      )}

      {/* Chat */}
      <div className="flex-1 overflow-y-auto px-2 py-2 bg-gray-50 border rounded-t-xl">
        {mensajes.length === 0 && (
          <div className="text-gray-400 text-center my-16">
            <span>¡Haz tu primera consulta jurídica a LitisBot!</span>
          </div>
        )}
        {mensajes.map((msg, i) => (
          <div
            key={i}
            className={`flex mb-2 ${msg.remitente === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`rounded-lg px-4 py-2 max-w-[85%] text-sm whitespace-pre-line
                ${msg.remitente === "user"
                  ? "bg-[#ffe5dc] text-[#b03a1a]"
                  : "bg-[#f5f6fa] text-gray-800 border"
                }`}
            >
              {msg.texto}
            </div>
          </div>
        ))}
        <div ref={chatRef}></div>
      </div>
      {/* Input de chat */}
      <form
        className="flex gap-2 border-t p-3 bg-white rounded-b-xl"
        onSubmit={e => {
          e.preventDefault();
          analizarTexto();
        }}
      >
        <input
          className="flex-1 border px-3 py-2 rounded-l-lg focus:outline-none"
          type="text"
          placeholder="Escribe tu consulta legal aquí…"
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={enviando}
        />
        <button
          className="bg-[#b03a1a] text-white px-4 py-2 rounded-r-lg font-semibold shadow hover:bg-[#a6380f] transition"
          disabled={enviando || !input.trim()}
          type="submit"
        >
          {enviando ? "..." : "Enviar"}
        </button>
      </form>
      {error && (
        <div className="bg-red-50 border-l-4 border-red-700 px-3 py-2 text-red-700 rounded">
          {error}
        </div>
      )}
    </div>
  );
}

