// src/hooks/useOpenAI.js
import { useState } from "react";
import { asAbsoluteUrl } from "@/utils/apiUrl";

export default function useOpenAI() {
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [response, setResponse] = useState(null);

  const sendMessage = async (messages, model = "gpt-4o-mini") => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      if (!Array.isArray(messages)) {
        throw new Error("El parámetro 'messages' debe ser un array válido.");
      }

      // 1) Usa VITE_API_URL si viene definida.
      // 2) Fallback: en prod -> /api/ia-litisbotchat ; en dev -> /api/openai
      const endpointFromEnv = import.meta.env.VITE_API_URL?.trim();
      const fallback = import.meta.env.PROD ? "/api/ia-litisbotchat" : "/api/openai";
      const endpoint = asAbsoluteUrl(endpointFromEnv || fallback);

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, model }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Error HTTP ${res.status}: ${text}`);
      }

      const data = await res.json();
      // Acepta { data }, { respuesta } o el cuerpo directo
      const payload = data?.data ?? data?.respuesta ?? data;

      if (!payload) {
        throw new Error("Respuesta inválida desde la API de OpenAI");
      }

      setResponse(payload);
      return payload;
    } catch (err) {
      console.error("❌ Error en useOpenAI:", err);
      setError(err.message || "Error inesperado");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { sendMessage, loading, error, response };
}
