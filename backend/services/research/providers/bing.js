// backend/services/research/providers/bing.js
export async function fetchBing({ q, max = 10 }) {
  if (!process.env.BING_API_KEY) return [];
  const url = new URL("https://api.bing.microsoft.com/v7.0/search");
  url.searchParams.set("q", q);
  url.searchParams.set("count", String(Math.min(max, 50)));
  const r = await fetch(url, {
    headers: { "Ocp-Apim-Subscription-Key": process.env.BING_API_KEY }
  });
  if (!r.ok) return [];
  const j = await r.json();
  const web = j.webPages?.value || [];
  return web.map(w => ({
    title: w.name,
    url: w.url,
    snippet: w.snippet,
    date: w.dateLastCrawled
  }));
}
