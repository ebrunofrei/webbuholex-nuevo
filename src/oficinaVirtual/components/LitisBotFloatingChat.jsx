import React, { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";

export default function LitisBotFloatingChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { sender: "bot", text: "👋 ¡Hola! Soy LitisBot, tu asistente legal en BúhoLex. ¿Sobre qué tema necesitas ayuda hoy?" }
  ]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  const handleSend = (e) => {
    e.preventDefault();
    if (input.trim()) {
      setMessages([...messages, { sender: "user", text: input.trim() }]);
      setTimeout(() => {
        setMessages((msgs) => [
          ...msgs,
          { sender: "bot", text: "Estoy pensando... Muy pronto tendrás respuesta profesional 🤖🦉" }
        ]);
      }, 700);
      setInput("");
    }
  };

  return (
    <>
      {!open && (
        <button
          className="fixed z-[9999] bottom-6 right-6 bg-[#801700] hover:bg-[#b34c00] shadow-2xl rounded-full w-16 h-16 flex items-center justify-center"
          style={{ boxShadow: "0 4px 24px rgba(128,23,0,0.20)" }}
          onClick={() => setOpen(true)}
          aria-label="Abrir chat LitisBot"
        >
          <img
            src="/logo-buho.png" // tu logo aquí
            alt="LitisBot"
            className="w-8 h-8"
          />
        </button>
      )}

      {open && (
        <div
          className="fixed z-[10000] bottom-4 right-2 sm:bottom-6 sm:right-6 w-[98vw] sm:w-80 max-w-[98vw] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fadeIn border-2 border-[#801700]"
          style={{ minHeight: 420, maxHeight: 550 }}
        >
          {/* Header */}
          <div className="bg-[#801700] flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2 text-white">
              <img src="/logo-buho.png" alt="LitisBot" className="w-7 h-7 rounded-full" />
              <span className="font-bold tracking-wide text-lg">LitisBot</span>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Cerrar chat">
              <X className="text-white" size={20} />
            </button>
          </div>
          {/* Mensajes */}
          <div
            className="flex-1 px-3 py-2 overflow-y-auto bg-[#f2f6fc] text-sm"
            style={{ scrollbarWidth: "thin", scrollbarColor: "#b2bec3 #e8e8e8" }}
          >
            {messages.map((msg, i) => (
              <div key={i} className={`mb-2 flex ${msg.sender === "bot" ? "justify-start" : "justify-end"}`}>
                <div
                  className={`rounded-lg px-3 py-2 ${
                    msg.sender === "bot"
                      ? "bg-[#f6d6c7] text-[#801700]"
                      : "bg-blue-200 text-blue-900"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          {/* Input */}
          <form className="flex gap-2 px-3 py-2 bg-white border-t" onSubmit={handleSend}>
            <input
              type="text"
              className="flex-1 outline-none bg-transparent"
              placeholder="Escribe aquí…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoFocus
            />
            <button
              type="submit"
              className="p-2 bg-[#801700] hover:bg-[#b34c00] rounded-full text-white"
              aria-label="Enviar"
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                <path d="M2 21l21-9-21-9v7l15 2-15 2v7z" fill="currentColor" />
              </svg>
            </button>
          </form>
        </div>
      )}

      {/* Animación FadeIn */}
      <style>
        {`
        .animate-fadeIn {
          animation: fadeIn 0.2s;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(32px);}
          to { opacity: 1; transform: translateY(0);}
        }
        `}
      </style>
    </>
  );
}
