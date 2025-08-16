import React, { useRef, useEffect, useState } from "react";
import ModalHerramientas from "./ModalHerramientas"; // Asegúrate de tener este componente
import { obtenerMemoriaPorCaso, guardarMemoriaPorCaso } from "@/services/litisbotMemoriaService";

export default function LitisBotChatBasePro({
  user,
  pro,
  casoActivo,
  expedientes = [],
  showModal,
  setShowModal,
}) {
  const [input, setInput] = useState("");
  const [mensajes, setMensajes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const scrollRef = useRef();

  // Carga historial/memoria cuando cambia el caso activo
  useEffect(() => {
    if (casoActivo) {
      obtenerMemoriaPorCaso(user?.uid, casoActivo?.id)
        .then(historial => setMensajes(historial || []))
        .catch(() => setMensajes([]));
    }
  }, [user?.uid, casoActivo?.id]);

  // Scroll automático al último mensaje
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensajes]);

  // Enviar mensaje
  async function handleSend() {
    if (!input.trim()) return;
    setCargando(true);

    // Agrega mensaje del usuario al historial
    const nuevosMensajes = [
      ...mensajes,
      { role: "user", texto: input, fecha: new Date().toISOString() },
    ];
    setMensajes(nuevosMensajes);

    // Aquí podrías enviar a tu backend y obtener la respuesta de LitisBot
    let respuestaBot = "...";
    try {
      // Llama a tu endpoint o función de IA personalizada
      // Ejemplo: const respuesta = await consultaLitisBot({ ... });
      respuestaBot = await obtenerRespuestaLegalLitisBot({
        user,
        casoId: casoActivo?.id,
        mensajes: nuevosMensajes,
      });
    } catch (e) {
      respuestaBot = "Ocurrió un error consultando a LitisBot. Intenta de nuevo.";
    }

    // Agrega respuesta del bot al historial
    const historialActualizado = [
      ...nuevosMensajes,
      { role: "assistant", texto: respuestaBot, fecha: new Date().toISOString() },
    ];
    setMensajes(historialActualizado);

    // Guarda memoria para este usuario/caso
    await guardarMemoriaPorCaso(user?.uid, casoActivo?.id, historialActualizado);

    setInput("");
    setCargando(false);
  }

  // Maneja Enter para enviar
  function handleInputKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // Modal de herramientas
  function abrirModalHerramientas() {
    setShowModal(true);
  }

  return (
    <div className="flex flex-col flex-1 h-full">
      {/* Modal de herramientas */}
      {showModal && (
        <ModalHerramientas
          onClose={() => setShowModal(false)}
          user={user}
          casoActivo={casoActivo}
        />
      )}

      {/* Cabecera del chat */}
      <div className="p-4 border-b flex justify-between items-center bg-white z-10">
        <div>
          <span className="font-bold text-lg">
            {casoActivo?.nombre || "Chat LitisBot Pro"}
          </span>
          {pro && (
            <span className="ml-2 text-xs text-blue-700 font-semibold px-2 py-1 rounded bg-blue-100">
              PRO
            </span>
          )}
        </div>
        <button
          className="ml-auto px-4 py-2 rounded bg-yellow-200 hover:bg-yellow-300 text-sm font-semibold"
          onClick={abrirModalHerramientas}
        >
          Herramientas legales
        </button>
      </div>

      {/* Mensajes */}
      <div
        className="flex-1 overflow-y-auto p-4 bg-[#fcf9ed]"
        ref={scrollRef}
        style={{ minHeight: 0, maxHeight: "calc(100vh - 170px)" }}
      >
        {mensajes.length === 0 && (
          <div className="text-center text-gray-400 italic">
            ¡Comienza la conversación legal con LitisBot!
          </div>
        )}
        {mensajes.map((msg, i) => (
          <div
            key={i}
            className={`mb-3 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`px-4 py-2 rounded-2xl shadow ${
                msg.role === "user"
                  ? "bg-yellow-200 text-right"
                  : "bg-white text-left border"
              }`}
              style={{ maxWidth: "75%" }}
            >
              <div className="whitespace-pre-line">{msg.texto}</div>
              <div className="text-xs text-gray-500 mt-1">{new Date(msg.fecha).toLocaleTimeString()}</div>
            </div>
          </div>
        ))}
        {cargando && (
          <div className="mb-3 flex justify-start">
            <div className="px-4 py-2 rounded-2xl shadow bg-white border text-left" style={{ maxWidth: "75%" }}>
              <span className="animate-pulse text-gray-400">LitisBot está redactando…</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 flex items-center bg-white border-t z-10">
        <input
          className="flex-1 border rounded-2xl px-4 py-2 focus:outline-none focus:ring"
          type="text"
          value={input}
          placeholder="Escribe o pega tu pregunta legal aquí…"
          disabled={cargando}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleInputKeyDown}
        />
        <button
          className="ml-3 px-5 py-2 bg-amber-400 rounded-2xl font-bold hover:bg-amber-500 transition"
          disabled={cargando || !input.trim()}
          onClick={handleSend}
        >
          {cargando ? "..." : "Enviar"}
        </button>
      </div>
    </div>
  );
}

// ---------------
// Debes tener implementado:
// - ModalHerramientas.jsx (el modal pro de tus herramientas legales)
// - litisbotMemoriaService.js en /services para obtenerMemoriaPorCaso y guardarMemoriaPorCaso
// - obtenerRespuestaLegalLitisBot: tu función de IA o fetch a backend que retorna respuesta legal avanzada

// Si necesitas ejemplo de esos servicios (memoria y respuesta IA), dime y te paso el código de apoyo.
// ---------------
