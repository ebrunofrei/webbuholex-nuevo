export default async function handler(req, res) {
  // --- CORS headers ---
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Origin",
    process.env.CORS_ORIGIN || "*" // ⚠️ cámbialo por tu dominio en producción si quieres limitar
  );
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // --- Preflight (OPTIONS) ---
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // Query dinámico (ej: ?q=penal+derecho+site:.pe)
    const query = req.query.q || "derecho+Perú+site:.pe";

    // Endpoint de tu proxy / backend scraping
    const url = `https://proxy.buholex.com/noticias?q=${encodeURIComponent(
      query
    )}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Fallo en la solicitud externa: ${response.status}`);
    }

    const noticias = await response.json();

    return res.status(200).json(noticias);
  } catch (err) {
    console.error("❌ Error noticias-juridicas:", err);
    return res
      .status(500)
      .json({ error: "Error al obtener noticias jurídicas." });
  }
}
