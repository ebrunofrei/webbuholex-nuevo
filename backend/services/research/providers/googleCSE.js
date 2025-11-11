// backend/services/research/providers/googleCSE.js
export async function fetchGoogleCSE({ q, max = 10 }) {
  const id = process.env.GOOGLE_CSE_ID;
  const key = process.env.GOOGLE_API_KEY;
  if (!id || !key) return [];
  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("cx", id);
  url.searchParams.set("key", key);
  url.searchParams.set("q", q);
  url.searchParams.set("num", String(Math.min(max, 10)));
  const r = await fetch(url);
  if (!r.ok) return [];
  const j = await r.json();
  const items = j.items || [];
  return items.map(i => ({
    title: i.title,
    url: i.link,
    snippet: i.snippet,
    date: i.pagemap?.metatags?.[0]?.["article:published_time"] || null
  }));
}
