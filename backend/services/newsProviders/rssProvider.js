import Parser from "rss-parser";

// Creamos parser con headers personalizados
const parser = new Parser({
  requestOptions: {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/rss+xml, application/xml, text/xml; q=0.9, */*; q=0.8",
    },
  },
});

export async function fetchFromRss(config) {
  const out = [];

  for (const url of config.rssUrls) {
    try {
      const feed = await parser.parseURL(url);

      for (const item of feed.items || []) {
        out.push({
          titulo: item.title?.trim() || "",
          descripcionRaw: (item.contentSnippet || item.summary || "").trim(),
          contenidoRaw: (item.content || "").trim(),
          enlace: item.link || "",
          fecha:
            item.isoDate
              ? new Date(item.isoDate)
              : item.pubDate
              ? new Date(item.pubDate)
              : new Date(),
          fuente: config.nombre,
          categoria: config.categoriaPorDefecto,
          idioma: config.idioma || "es",
          imagen: item.enclosure?.url || null,
        });
      }
    } catch (err) {
      console.error(`Error RSS fetch: ${url}`, err);
    }
  }

  return out;
}
