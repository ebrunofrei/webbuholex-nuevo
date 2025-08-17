import { useState } from "react";

export default function LitisBotChat() {
  const [mensajes, setMensajes] = useState([
    { from: "bot", text: "¡Hola! Soy LitisBot. Puedes dictar o escribir tu intervención." }
  ]);
  const [input, setInput] = useState("");

  const enviar = () => {
    if (!input) return;
    setMensajes([...mensajes, { from: "user", text: input }]);
    // Simulación respuesta bot
    setTimeout(() => setMensajes(msgs => [...msgs, { from: "bot", text: "Respuesta automática: " + input }]), 800);
    setInput("");
  };

  return (
    <div className="bg-white rounded-xl shadow p-5">
      <div className="max-h-80 overflow-y-auto mb-4">
        {mensajes.map((m, i) => (
          <div key={i} className={`mb-2 flex ${m.from === "bot" ? "justify-start" : "justify-end"}`}>
            <div className={`px-3 py-2 rounded-xl ${m.from === "bot" ? "bg-gray-100 text-gray-600" : "bg-[#b03a1a] text-white"}`}>{m.text}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 border px-3 py-2 rounded-lg"
          placeholder="Escribe o dicta tu mensaje..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && enviar()}
        />
        <button className="bg-[#b03a1a] text-white px-4 rounded-lg" onClick={enviar}>Enviar</button>
      </div>
      <div className="mt-3 flex gap-2">
        <button className="bg-gray-200 px-2 py-1 rounded">Citar norma</button>
        <button className="bg-gray-200 px-2 py-1 rounded">Modelo alegato</button>
        <button className="bg-gray-200 px-2 py-1 rounded">Resumen</button>
      </div>
    </div>
  );
}
