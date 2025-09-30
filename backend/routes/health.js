// api/health.js
export default async function handler(req, res) {
  try {
    res.setHeader("Content-Type", "application/json");

    return res.status(200).json({
      ok: true,
      status: "healthy",
      env: process.env.NODE_ENV || "unknown",
      uptime: process.uptime().toFixed(0) + "s",
      time: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error en /health:", error);
    return res.status(500).json({
      ok: false,
      status: "unhealthy",
      error: error.message,
    });
  }
}
