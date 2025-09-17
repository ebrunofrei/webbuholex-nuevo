import { useState } from "react";

export default function useOpenAI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [response, setResponse] = useState(null);

  const sendMessage = async (messages, model = "gpt-4o-mini") => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      // Validación básica
      if (!messages || !Array.isArray(messages)) {
        throw new Error("El parámetro 'messages' debe ser un array válido.");
      }

      const res = await fetch("/api/openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, model }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Error HTTP ${res.status}: ${errorText}`);
      }

      const data = await res.json();

      if (!data || !data.data) {
        throw new Error("Respuesta inválida desde la API de OpenAI");
      }

      setResponse(data.data);
      return data.data;
    } catch (err) {
      console.error("❌ Error en useOpenAI:", err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { sendMessage, loading, error, response };
}
