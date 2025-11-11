// backend/services/research/providers/serpapi.js
export async function fetchSerpApi({ q, max = 10 }) {
  if (!process.env.SERPAPI_KEY) return [];
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", q);
  url.searchParams.set("api_key", process.env.SERPAPI_KEY);
  url.searchParams.set("num", String(Math.min(max, 10)));
  const r = await fetch(url);
  if (!r.ok) return [];
  const j = await r.json();
  const items = j.organic_results || [];
  return items.map(i => ({
    title: i.title,
    url: i.link,
    snippet: i.snippet,
    date: i.date || null
  }));
}
