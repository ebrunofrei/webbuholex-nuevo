// api/noticias-juridicas.js
import Parser from "rss-parser";
const parser = new Parser({ headers: { "User-Agent": "Mozilla/5.0 (BuholexBot)" } });

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const page = Math.max(parseInt(req.query?.page || "1", 10), 1);
    const limit = Math.min(20, Math.max(parseInt(req.query?.limit || "8", 10), 1));
    const q = (req.query?.q || "jurisprudencia derecho Perú site:.pe").toString();

    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=es-419&gl=PE&ceid=PE:es`;
    const feed = await parser.parseURL(url);

    const items = (feed.items || []).map((it, i) => ({
      id: it.guid || it.link || `nj-${i}`,
      titulo: it.title || "",
      enlace: it.link || "",
      fecha: it.pubDate || "",
      resumen: it.contentSnippet || "",
      fuente: it.source || feed.title || "Google News"
    }));

    const start = (page - 1) * limit;
    const slice = items.slice(start, start + limit);

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json({ items: slice, hasMore: start + limit < items.length });
  } catch (err) {
    console.error("❌ noticias-juridicas:", err);
    return res.status(200).json({ items: [], hasMore: false });
  }
}
