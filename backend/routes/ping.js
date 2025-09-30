// api/ping.js  (o api/health-basic.js)
export default async function handler(req, res) {
  try {
    res.setHeader("Content-Type", "application/json");

    return res.status(200).json({
      ok: true,
      status: "alive",
      now: Date.now(),
      iso: new Date().toISOString(),
      env: process.env.NODE_ENV || "unknown",
      uptime: process.uptime().toFixed(0) + "s",
    });
  } catch (error) {
    console.error("❌ Error en /ping:", error);
    return res.status(500).json({
      ok: false,
      status: "error",
      error: error.message,
    });
  }
}
