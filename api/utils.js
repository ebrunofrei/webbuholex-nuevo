// /api/utils.js
export default async function handler(req, res) {
  const { action } = req.query;

  try {
    if (action === "news" && req.method === "GET") {
      res.json({ news: [] });

    } else if (action === "calendar" && req.method === "GET") {
      res.json({ events: [] });

    } else {
      res.status(400).json({ error: "Acción no soportada en UTILS" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
