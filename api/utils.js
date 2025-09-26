// api/utils.js
export default async function handler(req, res) {
  const { action } = req.query;

  try {
    if (action === "calendar" && req.method === "GET") {
      // Respuesta de ejemplo: eventos vacíos
      res.json({ events: [] });
    } else {
      res.status(400).json({ error: "Acción no soportada en UTILS" });
    }
  } catch (err) {
    console.error("❌ Error en utils:", err);
    res.status(500).json({ error: err.message });
  }
}
