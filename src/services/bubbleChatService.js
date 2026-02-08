import api from "@/services/apiClient";

export async function enviarMensajeIA(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Payload inválido para Bubble IA");
  }

  // Endpoint correcto (ya lo usas en backend)
  const data = await api.post("ia/chat", payload);

  return data;
}
