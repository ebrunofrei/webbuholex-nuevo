import express from 'express';
import Parser from 'rss-parser';
import cors from 'cors';

const app = express();
const parser = new Parser();

app.use(cors());
  origin: "*"

app.get('/api/noticias-juridicas', async (req, res) => {
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

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Proxy de noticias jurídicas en http://localhost:${PORT}`));

