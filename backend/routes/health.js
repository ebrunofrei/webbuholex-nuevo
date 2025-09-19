// api/health.js
export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({ ok: true, env: process.env.NODE_ENV || 'unknown', time: new Date().toISOString() });
}
