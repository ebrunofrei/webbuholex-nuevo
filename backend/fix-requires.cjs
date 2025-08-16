// server.cjs
const express = require("express");
const Parser = require("rss-parser");
const cors = require("cors");

const app = express();
const parser = new Parser();

app.use(cors());

// Ruta para unir noticias generales o por especialidad
app.get("/api/noticias-juridicas", async (req, res) => {
  // Recibe ?q=especialidad+derecho+site:.pe
  // Si no se pasa ?q, busca noticias generales
  const q = req.query.q || "derecho+OR+jurídico+OR+justicia+site:.pe";

  // Puedes agregar más fuentes aquí según necesidad
  const feeds = [
    {
      nombre: "Google News - Especialidad",
      url: `https://news.google.com/rss/search?q=${q}&hl=es-419&gl=PE&ceid=PE:es`,
    },
    {
      nombre: "ONU Derechos Humanos",
      url: "https://news.un.org/feed/subscribe/es/news/topic/human-rights/feed/rss.xml",
    }
  ];

  try {
    let todas = [];
    for (const fuente of feeds) {
      try {
        const feed = await parser.parseURL(fuente.url);
        const items = feed.items.map(item => ({
          fuente: fuente.nombre,
          titulo: item.title,
          resumen: item.contentSnippet || item.content || item.summary || "",
          enlace: item.link,
          fecha: item.pubDate,
        }));
        todas = todas.concat(items);
      } catch (e) {
        // Si una fuente falla, sigue con las demás
      }
    }
    // Ordena por fecha descendente
    todas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    res.json(todas);
  } catch (e) {
    res.status(500).json({ error: "No se pudo obtener noticias." });
  }
});

// Puerto configurable
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Proxy de noticias jurídicas en http://localhost:${PORT}`));
