import React, { useRef, useState, useEffect } from "react";
import litisbotLogo from "../assets/litisbot-logo.png"; // Logo único de LitisBot

export default function ModalLitisBot({ abierto, onClose }) {
  const [input, setInput] = useState("");
  const [mensajes, setMensajes] = useState([]);
  const chatEndRef = useRef();

  // Scroll automático
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [mensajes, abierto]);

  // Limpiar mensajes al cerrar (opcional)
  useEffect(() => {
    if (!abierto) setInput("");
  }, [abierto]);

  if (!abierto) return null;

  // Simulación llamada IA (reemplaza por llamada real)
  const handleSend = async e => {
    e.preventDefault();
    if (!input.trim()) return;
    const pregunta = input;
    setMensajes(msgs => [
      ...msgs,
      { remitente: "user", texto: pregunta }
    ]);
    setInput("");
    // Simulación de IA: 
    setTimeout(() => {
      setMensajes(msgs => [
        ...msgs,
        {
          remitente: "litisbot",
          texto: "Respuesta generada por LitisBot IA a tu consulta: \"" + pregunta + "\"."
        }
      ]);
    }, 1000);
  };

  return (
    <>
      {/* Fondo atenuado */}
      <div className="fixed inset-0 bg-black/30 z-[99]" onClick={onClose} />
      {/* Sidebar Chat */}
      <div className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white shadow-2xl z-[100] flex flex-col transition-all border-l-2 border-[#b03a1a]">
        {/* Encabezado */}
        <div className="flex items-center gap-2 px-6 pt-6 pb-2 border-b border-gray-200">
          <img src={litisbotLogo} alt="LitisBot Logo" className="w-14 h-14 rounded-xl border border-[#b03a1a] bg-white mr-2" />
          <div>
            <div className="font-extrabold text-[#b03a1a] text-lg leading-tight">LitisBot</div>
            <div className="text-xs text-gray-500 font-medium">Asistente Legal</div>
          </div>
          <button
            onClick={onClose}
            className="ml-auto text-2xl text-gray-500 hover:text-[#b03a1a] px-2"
            aria-label="Cerrar"
          >×</button>
        </div>
        {/* Chat */}
        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-4 bg-gray-50">
          {mensajes.length === 0 && (
            <div className="text-gray-400 text-center mt-8">¡Haz tu primera consulta jurídica a LitisBot!</div>
          )}
          {mensajes.map((msg, i) => (
            <div key={i} className={`flex ${msg.remitente === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] px-4 py-2 rounded-2xl shadow text-sm
                ${msg.remitente === "user"
                  ? "bg-[#ffe5dc] text-[#b03a1a] rounded-br-none"
                  : "bg-white border text-gray-700 rounded-bl-none flex items-center gap-2"}
              `}>
                {msg.remitente === "litisbot" && (
                  <img src={litisbotLogo} alt="LitisBot" className="w-7 h-7 mr-2" />
                )}
                {msg.texto}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        {/* Input */}
        <form
          onSubmit={handleSend}
          className="p-4 flex gap-2 border-t bg-white"
          autoComplete="off"
        >
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            type="text"
            placeholder="Escribe tu consulta legal aquí…"
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#b03a1a]"
            autoFocus
          />
          <button
            className="bg-[#b03a1a] text-white px-6 py-2 rounded-xl font-bold shadow hover:bg-[#4b2e19] transition"
            disabled={!input.trim()}
            type="submit"
          >
            Enviar
          </button>
        </form>
      </div>
    </>
  );
}
