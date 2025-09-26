// api/litisbot.js
export default async function handler(req, res) {
  // CORS/health & preflight
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      hint: "Usa POST con { prompt, historial } para consultar el chat.",
    });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, GET, OPTIONS");
    return res.status(405).json({ error: "Solo POST" });
  }

  try {
    // Asegurar JSON
    const body =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const { prompt, historial = [] } = body;

    if (!prompt) return res.status(400).json({ error: "Falta 'prompt' en el body" });

    // Construye URL absoluta para el fetch interno en Vercel
    const base =
      process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : (process.env.PUBLIC_BASE_URL || "http://localhost:5173"); // fallback local

    const r = await fetch(`${base}/api/ia?action=chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt, historial }),
    });

    const data = await r.json().catch(() => ({}));
    return res.status(r.status).json(data);
  } catch (err) {
    console.error("❌ /api/litisbot error:", err);
    return res.status(500).json({ error: err.message || "Error interno" });
  }
}
