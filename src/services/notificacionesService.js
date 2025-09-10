// src/services/notificacionesService.js

/**
 * Llama al backend para enviar una notificación push.
 * @param {string} tokenDestino - Token FCM obtenido en el cliente
 * @param {string} titulo - Título de la notificación
 * @param {string} cuerpo - Cuerpo de la notificación
 */
export async function enviarNotificacion(tokenDestino, titulo, cuerpo) {
  try {
    const res = await fetch("/api/notificaciones", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tokenDestino, titulo, cuerpo }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Error desconocido");
    }

    const data = await res.json();
    console.log("📩 Notificación enviada:", data);
    return data;
  } catch (err) {
    console.error("❌ Error llamando a notificaciones:", err);
    throw err;
  }
}
