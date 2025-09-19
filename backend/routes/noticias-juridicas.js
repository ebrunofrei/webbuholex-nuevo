// api/noticias-juridicas.js
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const q = (req.query?.q || 'derecho Perú site:.pe').toString();
    const UPSTREAM =
      process.env.NEWS_SOURCE_URL ||
      'https://buholex-news-proxy-production.up.railway.app/api/noticias-juridicas';

    const r = await fetch(`${UPSTREAM}?q=${encodeURIComponent(q)}`, {
      headers: { accept: 'application/json' },
    });

    // Si falla el upstream, devolvemos 502 (bad gateway) para distinguir de 404 local
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return res.status(502).json({ error: 'Upstream error', status: r.status, body: text });
    }

    const data = await r.json();
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(data);
  } catch (err) {
    console.error('X noticias-juridicas:', err);
    return res.status(500).json({ error: 'Error al obtener noticias jurídicas.' });
  }
}
