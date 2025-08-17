// src/services/analisisIAService.js
export async function consultaIALegal(mensaje, historial = []) {
  // Ejemplo de fetch a tu backend/IA:
  try {
    const context = historial.map(m =>
      `${m.remitente === "user" ? "Usuario" : "LitisBot"}: ${m.texto}`
    ).join('\n');
    const response = await fetch("https://tu-backend.com/consulta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: mensaje,
        historial: context,
      }),
    });
    if (!response.ok) throw new Error("Servidor IA no disponible");
    const data = await response.json();
    return data.respuesta || "No se pudo procesar su consulta legal en este momento.";
  } catch (err) {
    return "Ha ocurrido un error al consultar la IA legal. Inténtelo nuevamente más tarde.";
  }
}
