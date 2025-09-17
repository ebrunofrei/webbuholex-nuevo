// src/hooks/useOpenAI.js
import { useState } from "react";
import { asAbsoluteUrl } from "@/utils/apiUrl";

export default function useOpenAI() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [response, setResponse] = useState(null);

  const sendMessage = async (messages, model = "gpt-4o-mini") => {
    setLoading(true); setError(null); setResponse(null);
    try {
      if (!Array.isArray(messages)) throw new Error("El parámetro 'messages' debe ser un array válido.");

      // 1) toma VITE_API_URL si existe; 2) /api/openai; 3) fallback /api/ja-litisbotchat
      const endpoint =
        import.meta.env.VITE_API_URL ||
        "/api/openai" ||
        "/api/ja-litisbotchat";

      const url = asAbsoluteUrl(endpoint);

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, model }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Error HTTP ${res.status}: ${text}`);
      }

      const data = await res.json();
      if (!data || !data.data) throw new Error("Respuesta inválida desde la API de OpenAI");

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
