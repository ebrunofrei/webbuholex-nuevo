// api/noticias.js
import Parser from "rss-parser";
const parser = new Parser({
  headers: { "User-Agent": "Mozilla/5.0 (BuhoLexBot)" },
});

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const page = Math.max(parseInt(req.query?.page || "1"), 1);
    const limit = Math.min(Math.max(parseInt(req.query?.limit || "8"), 1), 20);
    const tipo = req.query?.tipo || "general";

    // Definir query según tipo
    let queryDefault = "Perú justicia OR ley OR congreso";
    if (tipo === "juridicas") {
      queryDefault = "jurisprudencia derecho Perú site:.pe";
    }

    const q = req.query?.q?.toString() || queryDefault;

    // Construir URL GNews
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=es-419&gl=PE&ceid=PE:es`;

    const feed = await parser.parseURL(url);

    const items = (feed.items || []).map((it, i) => ({
      id: it.link || `n-${i}`,
      titulo: it.title || "",
      enlace: it.link || "",
      fecha: it.pubDate || new Date().toISOString(),
      resumen: it.contentSnippet || "",
      fuente: feed.title || "Google News",
    }));

    // Paginación simple
    const start = (page - 1) * limit;
    const slice = items.slice(start, start + limit);

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json({
      items: slice,
      hasMore: start + limit < items.length,
    });
  } catch (err) {
    console.error("❌ Error en /api/noticias:", err);
    return res.status(200).json({ items: [], hasMore: false });
  }
}
