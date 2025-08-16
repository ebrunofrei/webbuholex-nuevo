// routes/noticias.js
import express from "express";
import Parser from "rss-parser";
const router = express.Router();
const parser = new Parser();

router.get("/noticias-juridicas", async (req, res) => {
  try {
    const q = req.query.q || "derecho";
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=es-419&gl=PE&ceid=PE:es`;
    const feed = await parser.parseURL(url);
    const noticias = feed.items.map(item => ({
      id: item.guid || item.link,
      titulo: item.title,
      enlace: item.link,
      fecha: item.pubDate,
      resumen: item.contentSnippet || "",
      fuente: item.source || (item.creator ? item.creator : feed.title),
      tagsAI: []
    }));
    res.json(noticias);
  } catch (e) {
    res.status(500).json({ error: "No se pudo obtener noticias." });
  }
});

export default router;
