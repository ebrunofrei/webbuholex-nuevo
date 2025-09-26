// api/noticias-juridicas.js
import Parser from "rss-parser";

const parser = new Parser();

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const q = (req.query?.q || "jurisprudencia derecho Perú site:.pe").toString();
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=es-419&gl=PE&ceid=PE:es`;

    const feed = await parser.parseURL(url);

    const noticias = (feed.items || []).map((item) => ({
      id: item.guid || item.link,
      titulo: item.title,
      enlace: item.link,
      fecha: item.pubDate,
      resumen: item.contentSnippet || "",
      fuente: item.source || feed.title,
    }));

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json(noticias);
  } catch (err) {
    console.error("❌ Error noticias jurídicas:", err);
    return res.status(500).json({ error: "Error al obtener noticias jurídicas." });
  }
}
