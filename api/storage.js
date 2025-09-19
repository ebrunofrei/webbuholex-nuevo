// /api/storage.js
import { storage } from "@/firebase";

export default async function handler(req, res) {
  const { action } = req.query;

  try {
    if (action === "upload" && req.method === "POST") {
      res.json({ message: "Archivo subido" });

    } else if (action === "getFile" && req.method === "GET") {
      res.json({ url: "https://archivo.url" });

    } else {
      res.status(400).json({ error: "Acción no soportada en STORAGE" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
