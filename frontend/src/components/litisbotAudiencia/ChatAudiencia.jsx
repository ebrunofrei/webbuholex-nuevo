import React, { useState } from "react";
import { useAudiencia } from "./useAudienciaContext";
import BotonMicrofono from "./BotonMicrofono";
import RespuestaBot from "./RespuestaBot";

export default function ChatAudiencia() {
  const { mensajes, setMensajes, sugerencias, micActivo, setMicActivo } = useAudiencia();
  const [input, setInput] = useState("");

  // Simula respuesta del bot (puedes cambiar por llamada real luego)
  function fetchRespuestaLitisBot(input) {
    return `LitisBot responde a: "${input}"`;
  }

  async function handleSend() {
    if (!input.trim()) return;
    const respuestaBot = fetchRespuestaLitisBot(input);
    const nuevoMsg = {
      id: Date.now(),
      textoUsuario: input,
      respuestaBot,
      utilFeedback: null,
      favorito: false,
    };
    setMensajes((prev) => [...prev, nuevoMsg]);
    setInput("");
    // Aquí puedes guardar en Firestore si quieres, o solo probar en local
  }

  return (
    <div className="w-full max-w-lg bg-white rounded shadow p-4">
      {/* Sugerencias arriba del input */}
      {sugerencias.length > 0 && (
        <div className="mb-2 flex gap-2 flex-wrap">
          {sugerencias.map((sug, i) => (
            <button
              key={i}
              className="bg-gray-200 px-3 py-1 rounded text-sm"
              onClick={() => setInput(sug.texto)}
              title={`Sugerencia: ${sug.tipo}`}
            >
              {sug.tipo === "materia" && `⚖️ ${sug.texto}`}
              {sug.tipo === "modelo" && `📄 ${sug.texto}`}
              {sug.tipo === "jurisprudencia" && `📚 ${sug.texto}`}
            </button>
          ))}
        </div>
      )}
      {/* Mensajes del chat */}
      <div className="h-96 overflow-y-auto mb-2 border rounded p-2 bg-gray-50">
        {mensajes.map((msg, i) => (
          <RespuestaBot key={i} msg={msg} />
        ))}
      </div>
      {/* Input y micrófono */}
      <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="flex gap-2 items-center">
        <BotonMicrofono activo={micActivo} setActivo={setMicActivo} setInput={setInput} />
        <input
          className="flex-1 border rounded p-2"
          placeholder="Escribe o dicta aquí…"
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button type="submit" className="bg-[#b03a1a] text-white px-4 py-2 rounded">Enviar</button>
      </form>
    </div>
  );
}
