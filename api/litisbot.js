// /api/litisbot.js
import iaHandler from "./ia";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Solo POST" });
  }
  // Forzamos la acción "chat" y delegamos en /api/ia
  req.query = { ...req.query, action: "chat" };
  return iaHandler(req, res);
}
