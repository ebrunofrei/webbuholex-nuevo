import axios from "axios";

const GNEWS_API_KEY = process.env.GNEWS_API_KEY;
const NEWSAPI_KEY = process.env.NEWSAPI_KEY;

export async function fetchNoticiasFallback(q = "peru") {
  try {
    // 👉 Primero GNews
    if (GNEWS_API_KEY) {
      const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(
        q
      )}&lang=es&country=pe&max=10&apikey=${GNEWS_API_KEY}`;
      const { data } = await axios.get(url);
      if (data?.articles?.length) {
        return data.articles.map((n) => ({
          titulo: n.title,
          resumen: n.description,
          enlace: n.url,
          fecha: n.publishedAt,
          fuente: "GNews",
        }));
      }
    }

    // 👉 Luego NewsAPI (si falla GNews)
    if (NEWSAPI_KEY) {
      const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(
        q
      )}&language=es&pageSize=10&sortBy=publishedAt`;
      const { data } = await axios.get(url, {
        headers: { "X-Api-Key": NEWSAPI_KEY },
      });
      if (data?.articles?.length) {
        return data.articles.map((n) => ({
          titulo: n.title,
          resumen: n.description,
          enlace: n.url,
          fecha: n.publishedAt,
          fuente: "NewsAPI",
        }));
      }
    }

    return [];
  } catch (err) {
    console.error("❌ Error en fetchNoticiasFallback:", err.message);
    return [];
  }
}
