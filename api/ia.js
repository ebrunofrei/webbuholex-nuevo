// api/ia.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt } = req.body || {};
    // respuesta de prueba (sin OpenAI todavía)
    return res.status(200).json({
      respuesta: `Recibí tu prompt: ${prompt}`,
    });
  } catch (err) {
    console.error("Error en handler /api/ia:", err);
    return res.status(500).json({ error: "Error interno en IA" });
  }
}
