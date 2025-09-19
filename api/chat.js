// /api/chat.js
export default async function handler(req, res) {
  const { action } = req.query;

  try {
    if (action === "send" && req.method === "POST") {
      res.json({ message: "Mensaje enviado" });

    } else if (action === "list" && req.method === "GET") {
      res.json({ messages: [] });

    } else {
      res.status(400).json({ error: "Acción no soportada en CHAT" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
