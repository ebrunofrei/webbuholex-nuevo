// /api/firestore.js
import { db } from "@/firebase"; // Ajusta import real

export default async function handler(req, res) {
  const { action } = req.query;

  try {
    if (action === "saveDoc" && req.method === "POST") {
      res.json({ message: "Documento guardado" });

    } else if (action === "getDocs" && req.method === "GET") {
      res.json({ docs: [] });

    } else if (action === "updateDoc" && req.method === "PUT") {
      res.json({ message: "Documento actualizado" });

    } else if (action === "deleteDoc" && req.method === "DELETE") {
      res.json({ message: "Documento eliminado" });

    } else {
      res.status(400).json({ error: "Acción no soportada en FIRESTORE" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
