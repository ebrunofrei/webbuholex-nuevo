// api/ping.js
export default function handler(req, res) {
  res.status(200).json({ pong: true, method: req.method, path: req.url });
}
