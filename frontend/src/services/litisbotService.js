// Para analizar imágenes/PDF (OCR)
export async function analizarOCRPorLitisBot(url, nombre, tipo = "") {
  const endpoint = "/api/analizar-ocr"; // Ajusta el endpoint si tu backend usa otra ruta
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, nombre, tipo }),
  });
  if (!res.ok) throw new Error("Error analizando OCR");
  const data = await res.json();
  return data;
}

// Para analizar archivos de audio/video/documento
export async function analizarArchivoPorLitisBot(url, nombre, tipo = "") {
  const endpoint = "/api/analizar-archivo"; // Ajusta si tu backend usa otra ruta
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, nombre, tipo }),
  });
  if (!res.ok) throw new Error("Error analizando archivo");
  const data = await res.json();
  return data;
}

// Para obtener respuesta IA (chat legal, contexto, etc.)
export async function obtenerRespuestaLitisBot(
  texto,
  area,
  expedienteId = null,
  contexto = null,
  historial = []
) {
  const endpoint = "/api/litisbot"; // Ajusta si tu backend usa otra ruta
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texto, area, expedienteId, contexto, historial }),
  });
  if (!res.ok) throw new Error("Error obteniendo respuesta IA");
  const data = await res.json();
  return data.respuesta || "No se obtuvo respuesta.";
}
