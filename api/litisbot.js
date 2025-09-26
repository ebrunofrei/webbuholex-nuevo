// /api/litisbot.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Solo POST" });
  }
  try {
    const { prompt, historial } = req.body || {};
    // Re-usa tu lógica de /api/ia.js llamándolo internamente o copiando su contenido
    // Aquí mismo podrías importar lo de ia.js si lo modularizas.
    // Para demo, hacemos un fetch interno (misma región):
    const r = await fetch(`${process.env.VERCEL_URL ? "https://" + process.env.VERCEL_URL : ""}/api/ia?action=chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, historial }),
    });
    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
