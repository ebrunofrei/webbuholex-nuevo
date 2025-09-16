import { db, auth, admin } from "../backend/services/firebaseAdmin.js";
export default async function handler(req, res) {
  try {
    const response = await fetch("https://proxy.buholex.com/noticias"); // URL real del backend con scraping o API
    if (!response.ok) throw new Error("Fallo en la solicitud externa.");
    const noticias = await response.json();
    res.status(200).json(noticias);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener noticias jurídicas." });
  }
}
