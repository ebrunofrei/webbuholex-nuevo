export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt, historial, usuarioId, userEmail, materia, modo, idioma } = req.body;

    // Aquí va tu lógica (ej: llamada a OpenAI)
    const respuesta = `Simulación de respuesta legal para: ${prompt}`;

    res.status(200).json({ respuesta });
  } catch (error) {
    console.error("Error en IA handler:", error);
    res.status(500).json({ error: "Error interno en IA" });
  }
}
