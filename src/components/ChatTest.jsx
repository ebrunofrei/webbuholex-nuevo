import React, { useState } from "react";
import useOpenAI from "@/hooks/useOpenAI";

export default function ChatTest() {
  const { sendMessage, loading, error, response } = useOpenAI();
  const [input, setInput] = useState("");

  const handleSend = async () => {
    if (!input.trim()) return;

    await sendMessage([
      { role: "system", content: "Eres un asistente legal experto en derecho peruano." },
      { role: "user", content: input },
    ]);

    setInput("");
  };

  return (
    <div className="p-4 max-w-lg mx-auto space-y-3">
      <h2 className="font-bold text-lg">🧪 Test de conexión OpenAI</h2>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Escribe una consulta legal..."
        className="border rounded p-2 w-full"
        rows={3}
      />

      <button
        onClick={handleSend}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        {loading ? "Consultando..." : "Enviar"}
      </button>

      {error && (
        <div className="text-red-600 mt-2">
          ❌ Error: {error}
        </div>
      )}

      {response && (
        <div className="mt-4 p-3 border rounded bg-gray-50">
          <strong>Respuesta IA:</strong>
          <p>{response.content}</p>
        </div>
      )}
    </div>
  );
}
